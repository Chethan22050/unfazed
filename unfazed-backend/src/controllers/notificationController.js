const Notification = require("../models/Notification");

const listNotifications = async (req, res) => {
  const notifications = await Notification.find({ therapist: req.user.id }).sort({ createdAt: -1 }).limit(100).lean();
  return res.status(200).json({ notifications });
};

const markRead = async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, therapist: req.user.id },
    { $set: { readAt: new Date() } },
    { returnDocument: "after" }
  );
  if (!notification) return res.status(404).json({ message: "Notification not found" });
  return res.status(200).json({ notification });
};

module.exports = { listNotifications, markRead };