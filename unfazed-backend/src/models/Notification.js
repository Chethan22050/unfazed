const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  therapist: { type: mongoose.Schema.Types.ObjectId, ref: "Therapist", required: true, index: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: "Client", default: null, index: true },
  session: { type: mongoose.Schema.Types.ObjectId, ref: "Session", default: null },
  event: { type: String, required: true, index: true },
  eventKey: { type: String, required: true, unique: true },
  title: { type: String, required: true, maxlength: 160 },
  message: { type: String, required: true, maxlength: 2000 },
  channels: {
    inApp: { type: String, enum: ["sent", "failed"], default: "sent" },
    email: { type: String, enum: ["sent", "queued", "skipped", "failed"], default: "skipped" },
    whatsapp: { type: String, enum: ["queued", "stubbed", "failed"], default: "stubbed" }
  },
  readAt: { type: Date, default: null }
}, { timestamps: true });

notificationSchema.index({ therapist: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);