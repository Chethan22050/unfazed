const { formatInTimeZone, fromZonedTime } = require("date-fns-tz");
const Availability = require("../models/Availability");
const Session = require("../models/Session");

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

const isValidTimezone = (timezone) => {
  try {
    new Intl.DateTimeFormat("en", { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
};

const parseClock = (value) => {
  if (!timePattern.test(value)) throw new Error("Times must use 24-hour HH:mm format");
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
};

const toDateString = (date) => date.toISOString().slice(0, 10);

const listDates = (start, end) => {
  const dates = [];
  const cursor = new Date(`${start}T12:00:00.000Z`);
  const last = new Date(`${end}T12:00:00.000Z`);
  while (cursor <= last) {
    dates.push(toDateString(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
};

const overlaps = (firstStart, firstEnd, firstBuffer, session) => {
  const existingStart = session.startAt.getTime();
  const existingEndWithBuffer = session.endAt.getTime() + session.bufferMinutes * 60000;
  if (firstStart >= session.endAt.getTime()) return firstStart < existingEndWithBuffer;
  return firstEnd + firstBuffer * 60000 > existingStart;
};

const makeSlotKeys = (startAt, endAt, bufferMinutes) => {
  const startMinute = Math.floor(startAt.getTime() / 60000);
  const endMinute = Math.ceil(endAt.getTime() / 60000) + bufferMinutes;
  const keys = [];
  for (let minute = startMinute; minute < endMinute; minute += 1) keys.push(String(minute));
  return keys;
};

const getAvailableSlots = async ({ therapistId, from, to, duration, displayTimezone }) => {
  if (!datePattern.test(from || "") || !datePattern.test(to || "")) {
    throw new Error("from and to must be dates in YYYY-MM-DD format");
  }
  const dates = listDates(from, to);
  if (!dates.length || dates.length > 31) throw new Error("Choose a date range of 1 to 31 days");
  if (dates.at(-1) !== to) throw new Error("to must be on or after from");
  if (!isValidTimezone(displayTimezone)) throw new Error("A valid IANA display timezone is required");

  const availability = await Availability.findOne({ therapist: therapistId }).lean();
  if (!availability) return { availability: null, slots: [] };
  if (!availability.sessionDurations.includes(Number(duration))) {
    throw new Error("That session duration is not offered");
  }

  const timezone = availability.timezone;
  const sessionRate = (availability.sessionRates || []).find((rate) => rate.durationMinutes === Number(duration));
  const firstUtc = fromZonedTime(`${from}T00:00:00`, timezone);
  const lastUtc = fromZonedTime(`${to}T23:59:59`, timezone);
  const bookings = await Session.find({
    therapist: therapistId,
    status: { $in: ["confirmed", "pending"] },
    startAt: { $lte: lastUtc },
    endAt: { $gte: firstUtc }
  }).select("startAt endAt bufferMinutes").lean();

  const slots = [];
  const uniqueSlots = new Set();
  for (const date of dates) {
    const weekday = new Date(`${date}T12:00:00.000Z`).getUTCDay();
    const periods = availability.weekly
      .filter((window) => window.dayOfWeek === weekday)
      .map((window) => ({ startTime: window.startTime, endTime: window.endTime }));
    const overrides = availability.overrides.filter((override) => override.date === date);
    periods.push(...overrides
      .filter((override) => override.type === "available")
      .map(({ startTime, endTime }) => ({ startTime, endTime })));
    const blocked = overrides.filter((override) => override.type === "blocked");

    for (const period of periods) {
      const startMinute = parseClock(period.startTime);
      const endMinute = parseClock(period.endTime);
      for (let minute = startMinute; minute + Number(duration) <= endMinute; minute += Number(duration)) {
        const localStart = `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
        const localEndMinute = minute + Number(duration);
        const localEnd = `${String(Math.floor(localEndMinute / 60)).padStart(2, "0")}:${String(localEndMinute % 60).padStart(2, "0")}`;
        if (blocked.some((block) => localStart < block.endTime && localEnd > block.startTime)) continue;

        const startAt = fromZonedTime(`${date}T${localStart}:00`, timezone);
        const endAt = new Date(startAt.getTime() + Number(duration) * 60000);
        if (startAt.getTime() <= Date.now()) continue;
        if (uniqueSlots.has(startAt.toISOString())) continue;
        if (bookings.some((booking) => overlaps(startAt.getTime(), endAt.getTime(), availability.bufferMinutes, booking))) continue;
        uniqueSlots.add(startAt.toISOString());
        slots.push({
          startAt: startAt.toISOString(),
          endAt: endAt.toISOString(),
          localStart,
          localEnd,
          localDate: date,
          displayStart: formatInTimeZone(startAt, displayTimezone, "yyyy-MM-dd'T'HH:mmXXX"),
          therapistTimezone: timezone,
          displayTimezone,
          durationMinutes: Number(duration),
          pricePaise: sessionRate?.amountPaise || 0,
          currency: process.env.CURRENCY || "INR"
        });
      }
    }
  }

  return { availability, slots };
};

module.exports = {
  getAvailableSlots,
  isValidTimezone,
  makeSlotKeys,
  parseClock,
  timePattern,
  datePattern
};