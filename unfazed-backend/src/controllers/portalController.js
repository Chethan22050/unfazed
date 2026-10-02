const Client = require("../models/Client");
const Session = require("../models/Session");
const Therapist = require("../models/Therapist");

const getPortalProfile = async (req, res) => {
  const { clientId, therapistId } = req.clientAccess;
  const [client, therapist, sessions] = await Promise.all([
    Client.findOne({ _id: clientId, therapist: therapistId }).select("name status intake.presentingConcern").lean(),
    Therapist.findById(therapistId).select("name slug bio specializations languages services").lean(),
    Session.find({ client: clientId, therapist: therapistId, status: { $in: ["confirmed", "pending", "completed"] } })
      .select("startAt endAt durationMinutes status therapistTimezone")
      .sort({ startAt: 1 })
      .lean()
  ]);
  if (!client || !therapist) return res.status(404).json({ message: "Client portal record not found" });
  return res.status(200).json({ client, therapist, sessions });
};

module.exports = { getPortalProfile };