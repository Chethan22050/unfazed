const Session = require("../models/Session");
const SessionNote = require("../models/SessionNote");
const { canAccess } = require("../services/entitlementService");

const listSessionNotes = async (req, res) => {
  const session = await Session.findOne({ _id: req.params.sessionId, therapist: req.user.id }).select("_id").lean();
  if (!session) return res.status(404).json({ message: "Session not found" });
  const notes = await SessionNote.find({ therapist: req.user.id, session: session._id }).sort({ updatedAt: -1 }).lean();
  return res.status(200).json({ notes });
};

const createSessionNote = async (req, res) => {
  if (["soap", "dap"].includes(req.body.format)) {
    const access = await canAccess(req.user.id, `notes.${req.body.format}`);
    if (!access.allowed) return res.status(403).json({ message: access.reason, code: "ENTITLEMENT_REQUIRED", featureKey: access.featureKey, tier: access.tier, upgradeRequired: true });
  }
  const session = await Session.findOne({ _id: req.params.sessionId, therapist: req.user.id }).select("_id client").lean();
  if (!session) return res.status(404).json({ message: "Session not found" });
  if (req.body.type === "private" && req.body.shareWithClient === true) {
    return res.status(400).json({ message: "A note cannot be private and shared at the same time" });
  }
  const note = await SessionNote.create({
    therapist: req.user.id,
    client: session.client,
    session: session._id,
    type: req.body.type,
    format: req.body.format,
    title: req.body.title,
    content: req.body.content,
    sections: req.body.sections
  });
  return res.status(201).json({ note });
};

const updateSessionNote = async (req, res) => {
  const updates = {};
  for (const field of ["type", "format", "title", "content", "sections"]) {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  }
  const note = await SessionNote.findOneAndUpdate(
    { _id: req.params.noteId, therapist: req.user.id },
    { $set: updates },
    { returnDocument: "after", runValidators: true }
  );
  if (!note) return res.status(404).json({ message: "Session note not found" });
  return res.status(200).json({ note });
};

const clientSharedNotes = async (req, res) => {
  const clientId = req.clientAccess.clientId;
  const therapistId = req.clientAccess.therapistId;
  const notes = await SessionNote.find({ client: clientId, therapist: therapistId, type: "shared" })
    .select("title content format sections session createdAt updatedAt")
    .populate("session", "startAt durationMinutes therapistTimezone")
    .sort({ createdAt: -1 })
    .lean();
  return res.status(200).json({ notes: notes.map(({ _id, title, content, format, sections, session, createdAt }) => ({
    _id, title, content, format, sections, session, createdAt
  })) });
};

module.exports = { listSessionNotes, createSessionNote, updateSessionNote, clientSharedNotes };