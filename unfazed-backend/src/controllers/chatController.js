const Client = require("../models/Client");
const Message = require("../models/Message");

const listTherapistMessages = async (req, res) => {
  const client = await Client.findOne({ _id: req.params.clientId, therapist: req.user.id }).select("_id").lean();
  if (!client) return res.status(404).json({ message: "Conversation not found" });
  const messages = await Message.find({ therapist: req.user.id, client: client._id }).sort({ createdAt: 1 }).limit(500).lean();
  await Message.updateMany({ therapist: req.user.id, client: client._id, senderRole: "client", readAt: null }, { $set: { readAt: new Date() } });
  return res.status(200).json({ messages });
};

const listClientMessages = async (req, res) => {
  const { clientId, therapistId } = req.clientAccess;
  const messages = await Message.find({ therapist: therapistId, client: clientId }).sort({ createdAt: 1 }).limit(500).lean();
  await Message.updateMany({ therapist: therapistId, client: clientId, senderRole: "therapist", readAt: null }, { $set: { readAt: new Date() } });
  return res.status(200).json({ messages });
};

module.exports = { listTherapistMessages, listClientMessages };