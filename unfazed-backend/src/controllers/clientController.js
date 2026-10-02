const Client = require("../models/Client");
const Session = require("../models/Session");
const ClientPackage = require("../models/ClientPackage");
const Therapist = require("../models/Therapist");
const { createClientAccessToken } = require("../utils/clientAccessToken");
const { canAccess } = require("../services/entitlementService");

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const submitIntake = async (req, res) => {
  try {
    const therapist = await Therapist.findOne({ slug: req.params.slug.toLowerCase() }).select("_id").lean();
    if (!therapist) return res.status(404).json({ message: "Therapist profile not found" });

    const email = req.body.email.trim().toLowerCase();
    const existingClient = await Client.findOne({ therapist: therapist._id, email }).select("_id status").lean();
    if (!existingClient || existingClient.status !== "active") {
      const access = await canAccess(therapist._id, "clients.active", { newActiveClient: true });
      if (!access.allowed) {
        return res.status(403).json({ message: access.reason, code: "ENTITLEMENT_REQUIRED", featureKey: access.featureKey, tier: access.tier, upgradeRequired: true });
      }
    }
    const client = await Client.findOneAndUpdate(
      { therapist: therapist._id, email },
      {
        $set: {
          name: req.body.name.trim(),
          phone: req.body.phone || "",
          status: "active",
          intake: {
            demographics: req.body.demographics || {},
            presentingConcern: req.body.presentingConcern || "",
            history: req.body.history || ""
          },
          consent: { accepted: true, acceptedAt: new Date(), version: "intake-v1" }
        },
        $setOnInsert: { therapist: therapist._id, email }
      },
      { returnDocument: "after", upsert: true, runValidators: true, setDefaultsOnInsert: true }
    ).select("_id name email status consent.acceptedAt");

    return res.status(200).json({ message: "Intake and consent received", client });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "An intake for this email is already being processed" });
    return res.status(500).json({ message: "Unable to save intake" });
  }
};

const listClients = async (req, res) => {
  const filter = { therapist: req.user.id };
  if (["lead", "active", "archived"].includes(req.query.status)) filter.status = req.query.status;
  if (req.query.search) {
    const search = new RegExp(escapeRegex(req.query.search.trim().slice(0, 80)), "i");
    filter.$or = [{ name: search }, { email: search }, { tags: search }];
  }
  const sortField = ["name", "createdAt", "lastSessionAt"].includes(req.query.sort) ? req.query.sort : "createdAt";
  const direction = req.query.direction === "asc" ? 1 : -1;
  const clients = await Client.find(filter)
    .select("name email phone status tags lastSessionAt consent.accepted createdAt")
    .sort({ [sortField]: direction })
    .limit(200)
    .lean();
  return res.status(200).json({ clients });
};

const getClient = async (req, res) => {
  const client = await Client.findOne({ _id: req.params.id, therapist: req.user.id }).lean();
  if (!client) return res.status(404).json({ message: "Client not found" });
  const [sessions, packages] = await Promise.all([
    Session.find({ therapist: req.user.id, client: client._id })
      .sort({ startAt: -1 })
      .select("startAt endAt durationMinutes status therapistTimezone")
      .lean(),
    ClientPackage.find({ therapist: req.user.id, client: client._id })
      .populate("package", "title sessionCount")
      .sort({ createdAt: -1 })
      .lean()
  ]);
  return res.status(200).json({ client, sessions, packages: packages.map((clientPackage) => ({
    ...clientPackage,
    status: clientPackage.status === "active" && clientPackage.expiresAt <= new Date() ? "expired" : clientPackage.status
  })) });
};

const updateClient = async (req, res) => {
  const updates = {};
  if (req.body.status !== undefined) updates.status = req.body.status;
  if (req.body.tags !== undefined) updates.tags = req.body.tags;
  if (req.body.phone !== undefined) updates.phone = req.body.phone;
  if (req.body.status === "active") {
    const currentClient = await Client.findOne({ _id: req.params.id, therapist: req.user.id }).select("status").lean();
    if (!currentClient) return res.status(404).json({ message: "Client not found" });
    if (currentClient.status !== "active") {
      const access = await canAccess(req.user.id, "clients.active", { newActiveClient: true });
      if (!access.allowed) return res.status(403).json({ message: access.reason, code: "ENTITLEMENT_REQUIRED", featureKey: access.featureKey, tier: access.tier, upgradeRequired: true });
    }
  }
  const client = await Client.findOneAndUpdate(
    { _id: req.params.id, therapist: req.user.id },
    { $set: updates },
    { returnDocument: "after", runValidators: true }
  ).select("name email phone status tags lastSessionAt consent");
  if (!client) return res.status(404).json({ message: "Client not found" });
  return res.status(200).json({ client });
};

const createPortalLink = async (req, res) => {
  const client = await Client.findOne({ _id: req.params.id, therapist: req.user.id }).select("_id").lean();
  if (!client) return res.status(404).json({ message: "Client not found" });
  const access = await canAccess(req.user.id, "client.portal");
  if (!access.allowed) return res.status(403).json({ message: access.reason, code: "ENTITLEMENT_REQUIRED", featureKey: access.featureKey, tier: access.tier, upgradeRequired: true });
  const accessToken = createClientAccessToken(client._id, req.user.id);
  return res.status(200).json({ accessToken, expiresIn: "30d" });
};

module.exports = { submitIntake, listClients, getClient, updateClient, createPortalLink };