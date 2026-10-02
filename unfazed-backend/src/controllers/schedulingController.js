const { body, param, query, validationResult } = require("express-validator");
const Availability = require("../models/Availability");
const Session = require("../models/Session");
const Therapist = require("../models/Therapist");
const Client = require("../models/Client");
const ClientPackage = require("../models/ClientPackage");
const { createPaymentOrder } = require("../services/paymentService");
const { notifyEvent } = require("../services/notificationService");
const { getAvailableSlots, isValidTimezone, makeSlotKeys, parseClock } = require("../services/schedulingService");

const validateAvailability = (req, res, next) => {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    return res.status(400).json({ message: "Request validation failed", errors: result.array() });
  }

  const { timezone, weekly, overrides = [], sessionDurations, sessionRates = [], bufferMinutes } = req.body;
  if (!isValidTimezone(timezone)) return res.status(400).json({ message: "A valid IANA timezone is required" });
  if (bufferMinutes < 0 || bufferMinutes > 120) return res.status(400).json({ message: "Buffer must be between 0 and 120 minutes" });
  if (sessionDurations.some((duration) => ![30, 45, 60, 90].includes(duration))) {
    return res.status(400).json({ message: "Session durations must be 30, 45, 60, or 90 minutes" });
  }
  const ratedDurations = sessionRates.map((rate) => rate.durationMinutes);
  if (new Set(ratedDurations).size !== ratedDurations.length || sessionRates.some((rate) => !sessionDurations.includes(rate.durationMinutes))) {
    return res.status(400).json({ message: "Each session rate must match one unique offered duration" });
  }

  try {
    for (const window of [...weekly, ...overrides]) {
      if (parseClock(window.startTime) >= parseClock(window.endTime)) {
        return res.status(400).json({ message: "Availability windows must end after they start" });
      }
    }
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
  return next();
};

const putAvailability = async (req, res) => {
  try {
    const availability = await Availability.findOneAndUpdate(
      { therapist: req.user.id },
      {
        therapist: req.user.id,
        timezone: req.body.timezone,
        weekly: req.body.weekly,
        overrides: req.body.overrides,
        sessionDurations: req.body.sessionDurations,
        sessionRates: req.body.sessionRates || [],
        bufferMinutes: req.body.bufferMinutes
      },
      { returnDocument: "after", upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    return res.status(200).json({ availability });
  } catch {
    return res.status(500).json({ message: "Unable to save availability" });
  }
};

const getAvailability = async (req, res) => {
  const availability = await Availability.findOne({ therapist: req.user.id }).lean();
  return res.status(200).json({ availability, currency: process.env.CURRENCY || "INR" });
};

const getSlots = async (req, res) => {
  try {
    const therapist = await Therapist.findOne({ slug: req.params.slug.toLowerCase() }).select("_id").lean();
    if (!therapist) return res.status(404).json({ message: "Therapist profile not found" });
    const result = await getAvailableSlots({
      therapistId: therapist._id,
      from: req.query.from,
      to: req.query.to,
      duration: Number(req.query.duration),
      displayTimezone: req.query.timezone
    });
    return res.status(200).json({ slots: result.slots, availability: result.availability && {
      timezone: result.availability.timezone,
      sessionDurations: result.availability.sessionDurations,
      sessionRates: result.availability.sessionRates,
      currency: process.env.CURRENCY || "INR"
    } });
  } catch (error) {
    return res.status(400).json({ message: error.message || "Unable to load appointment slots" });
  }
};

const createBooking = async (req, res) => {
  try {
    const therapist = await Therapist.findOne({ slug: req.body.therapistSlug.toLowerCase() }).select("_id slug").lean();
    if (!therapist) return res.status(404).json({ message: "Therapist profile not found" });
    const availability = await Availability.findOne({ therapist: therapist._id }).lean();
    if (!availability) return res.status(409).json({ message: "This therapist has not opened availability yet" });
    if (!isValidTimezone(req.body.clientTimezone)) return res.status(400).json({ message: "A valid client timezone is required" });

    const startAt = new Date(req.body.startAt);
    if (Number.isNaN(startAt.getTime()) || startAt.getSeconds() !== 0 || startAt.getMilliseconds() !== 0) {
      return res.status(400).json({ message: "Choose a valid available start time" });
    }
    const localDate = require("date-fns-tz").formatInTimeZone(startAt, availability.timezone, "yyyy-MM-dd");
    const slotsResult = await getAvailableSlots({
      therapistId: therapist._id,
      from: localDate,
      to: localDate,
      duration: Number(req.body.durationMinutes),
      displayTimezone: req.body.clientTimezone
    });
    const offeredSlot = slotsResult.slots.find((slot) => slot.startAt === startAt.toISOString());
    if (!offeredSlot) return res.status(409).json({ message: "That appointment slot is no longer available" });

    const endAt = new Date(startAt.getTime() + Number(req.body.durationMinutes) * 60000);
    const client = await Client.findOneAndUpdate(
      { therapist: therapist._id, email: req.body.clientEmail.trim().toLowerCase() },
      { $setOnInsert: {
        therapist: therapist._id,
        email: req.body.clientEmail.trim().toLowerCase(),
        name: req.body.clientName.trim(),
        status: "lead"
      } },
      { returnDocument: "after", upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    if (!client.consent?.accepted) {
      return res.status(409).json({ code: "INTAKE_REQUIRED", message: "Complete the intake form and consent before booking your first session" });
    }
    const clientPackage = req.body.clientPackageId
      ? await ClientPackage.findOne({
        _id: req.body.clientPackageId,
        therapist: therapist._id,
        client: client._id,
        status: "active",
        sessionsRemaining: { $gt: 0 },
        expiresAt: { $gt: new Date() }
      })
      : null;
    if (req.body.clientPackageId && !clientPackage) {
      return res.status(409).json({ message: "The session package is invalid, expired, or has no sessions remaining" });
    }
    const amountPaise = clientPackage ? 0 : (availability.sessionRates || []).find((rate) => rate.durationMinutes === Number(req.body.durationMinutes))?.amountPaise || 0;
    const session = await Session.create({
      therapist: therapist._id,
      client: client._id,
      clientPackage: clientPackage?._id || null,
      clientName: req.body.clientName.trim(),
      clientEmail: req.body.clientEmail.trim().toLowerCase(),
      startAt,
      endAt,
      therapistTimezone: availability.timezone,
      clientTimezone: req.body.clientTimezone,
      durationMinutes: Number(req.body.durationMinutes),
      amountPaise,
      bufferMinutes: availability.bufferMinutes,
      status: amountPaise > 0 ? "pending" : "confirmed",
      slotKeys: makeSlotKeys(startAt, endAt, availability.bufferMinutes)
    });
    if (clientPackage) {
      const updatedPackage = await ClientPackage.findOneAndUpdate(
        { _id: clientPackage._id, status: "active", sessionsRemaining: { $gt: 0 }, expiresAt: { $gt: new Date() } },
        { $inc: { sessionsRemaining: -1 } },
        { returnDocument: "after" }
      );
      if (!updatedPackage) {
        await Session.findByIdAndUpdate(session._id, { $set: { status: "cancelled", slotKeys: [] } });
        return res.status(409).json({ message: "The session package was just used or expired" });
      }
      if (updatedPackage.sessionsRemaining === 0) {
        await ClientPackage.updateOne({ _id: updatedPackage._id }, { $set: { status: "exhausted" } });
      }
      await Client.updateOne({ _id: client._id }, { $max: { lastSessionAt: startAt } });
      notifyEvent({
        therapistId: therapist._id,
        client,
        session,
        event: "booking.confirmed",
        eventKey: `booking-confirmed:${session._id}`,
        title: "Appointment confirmed",
        message: `Your ${session.durationMinutes}-minute session is booked.`
      }).catch(() => {});
      return res.status(201).json({ message: "Session booked with package credit", session, sessionsRemaining: updatedPackage.sessionsRemaining });
    }
    if (amountPaise > 0) {
      try {
        const { payment, order } = await createPaymentOrder({
          therapistId: therapist._id,
          clientId: client._id,
          sessionId: session._id,
          amountPaise
        });
        return res.status(201).json({ message: "Appointment held pending advance payment", session, payment: { id: payment._id }, order });
      } catch (error) {
        await Session.findByIdAndUpdate(session._id, { $set: { status: "cancelled", slotKeys: [] } });
        throw error;
      }
    }
    await Client.updateOne({ _id: client._id }, { $max: { lastSessionAt: startAt } });
    notifyEvent({
      therapistId: therapist._id,
      client,
      session,
      event: "booking.confirmed",
      eventKey: `booking-confirmed:${session._id}`,
      title: "Appointment confirmed",
      message: `Your ${session.durationMinutes}-minute session is booked for ${new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: session.clientTimezone }).format(startAt)}.`
    }).catch(() => {});
    return res.status(201).json({ message: "Appointment booked", session });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "That appointment was just booked by someone else" });
    return res.status(500).json({ message: "Unable to book appointment" });
  }
};

const getTherapistSessions = async (req, res) => {
  const sessions = await Session.find({ therapist: req.user.id })
    .sort({ startAt: 1 })
    .populate("client", "name email status")
    .lean();
  return res.status(200).json({ sessions });
};

const cancelSession = async (req, res) => {
  const session = await Session.findOneAndUpdate(
    { _id: req.params.id, therapist: req.user.id, status: { $in: ["confirmed", "pending"] } },
    { $set: { status: "cancelled", slotKeys: [] } },
    { returnDocument: "after" }
  );
  if (!session) return res.status(404).json({ message: "Active appointment not found" });
  return res.status(200).json({ message: "Appointment cancelled", session });
};

const updateSessionStatus = async (req, res) => {
  const session = await Session.findOneAndUpdate(
    { _id: req.params.id, therapist: req.user.id, status: { $in: ["confirmed", "pending"] } },
    { $set: { status: req.body.status } },
    { returnDocument: "after" }
  );
  if (!session) return res.status(404).json({ message: "Active appointment not found" });
  if (session.status === "completed") {
    const client = await Client.findById(session.client).select("name email").lean();
    if (client) notifyEvent({
      therapistId: session.therapist,
      client,
      session,
      event: "session.follow_up",
      eventKey: `session-follow-up:${session._id}`,
      title: "A note after your session",
      message: "Your therapist has marked your session complete. Contact your therapist if you need follow-up support."
    }).catch(() => {});
  }
  return res.status(200).json({ session });
};

const availabilityRules = [
  body("timezone").isString().notEmpty(),
  body("weekly").isArray(),
  body("weekly.*.dayOfWeek").isInt({ min: 0, max: 6 }).toInt(),
  body("weekly.*.startTime").isString().matches(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
  body("weekly.*.endTime").isString().matches(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
  body("overrides").optional().isArray(),
  body("overrides.*.date").isISO8601({ strict: true, strictSeparator: true }),
  body("overrides.*.type").isIn(["available", "blocked"]),
  body("overrides.*.startTime").isString().matches(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
  body("overrides.*.endTime").isString().matches(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
  body("sessionDurations").isArray({ min: 1 }),
  body("sessionDurations.*").isInt().toInt(),
  body("sessionRates").optional().isArray(),
  body("sessionRates.*.durationMinutes").isInt().toInt(),
  body("sessionRates.*.amountPaise").isInt({ min: 1 }).toInt(),
  body("bufferMinutes").isInt({ min: 0, max: 120 }).toInt()
];

const slotRules = [
  param("slug").isString().trim().notEmpty(),
  query("from").isISO8601({ strict: true, strictSeparator: true }),
  query("to").isISO8601({ strict: true, strictSeparator: true }),
  query("duration").isInt().toInt(),
  query("timezone").isString().notEmpty()
];

const bookingRules = [
  body("therapistSlug").isString().trim().notEmpty(),
  body("clientName").isString().trim().isLength({ min: 2, max: 100 }),
  body("clientEmail").isEmail().normalizeEmail(),
  body("startAt").isISO8601({ strict: true }),
  body("durationMinutes").isInt({ min: 30, max: 90 }).toInt(),
  body("clientPackageId").optional().isMongoId(),
  body("clientTimezone").isString().notEmpty()
];

const sessionStatusRules = [
  param("id").isMongoId(),
  body("status").isIn(["completed", "no_show"])
];

const validate = (req, res, next) => {
  const result = validationResult(req);
  if (!result.isEmpty()) return res.status(400).json({ message: "Request validation failed", errors: result.array() });
  return next();
};

module.exports = {
  putAvailability,
  getAvailability,
  getSlots,
  createBooking,
  getTherapistSessions,
  cancelSession,
  updateSessionStatus,
  availabilityRules,
  slotRules,
  bookingRules,
  sessionStatusRules,
  validate
};