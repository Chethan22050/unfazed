const Session = require("../models/Session");
const Client = require("../models/Client");
const { notifyEvent } = require("./notificationService");

const dispatchUpcomingReminders = async () => {
  const now = Date.now();
  const sessions = await Session.find({
    status: "confirmed",
    startAt: { $gt: new Date(now + 23 * 60 * 60 * 1000), $lte: new Date(now + 24 * 60 * 60 * 1000) }
  }).lean();

  for (const session of sessions) {
    const client = await Client.findById(session.client).select("name email").lean();
    if (!client) continue;
    await notifyEvent({
      therapistId: session.therapist,
      client,
      session,
      event: "session.reminder_24h",
      eventKey: `session-reminder-24h:${session._id}`,
      title: "Upcoming therapy session",
      message: `Your session is scheduled for ${new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: session.clientTimezone }).format(session.startAt)}.`
    });
  }
};

const startNotificationScheduler = () => {
  const timer = setInterval(() => {
    dispatchUpcomingReminders().catch((error) => console.error("Notification scheduler failed:", error.message));
  }, 15 * 60 * 1000);
  timer.unref();
  dispatchUpcomingReminders().catch((error) => console.error("Notification scheduler failed:", error.message));
  return timer;
};

module.exports = { startNotificationScheduler, dispatchUpcomingReminders };