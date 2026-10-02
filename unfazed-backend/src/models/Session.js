const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema({
  therapist: { type: mongoose.Schema.Types.ObjectId, ref: "Therapist", required: true, index: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: "Client", default: null, index: true },
  clientPackage: { type: mongoose.Schema.Types.ObjectId, ref: "ClientPackage", default: null },
  clientName: { type: String, required: true, trim: true },
  clientEmail: { type: String, required: true, lowercase: true, trim: true },
  startAt: { type: Date, required: true, index: true },
  endAt: { type: Date, required: true },
  therapistTimezone: { type: String, required: true },
  clientTimezone: { type: String, required: true },
  durationMinutes: { type: Number, required: true },
  amountPaise: { type: Number, min: 0, default: 0 },
  bufferMinutes: { type: Number, default: 0 },
  status: { type: String, enum: ["confirmed", "pending", "cancelled", "completed", "no_show"], default: "confirmed", index: true },
  slotKeys: { type: [String], default: [] }
}, { timestamps: true });

sessionSchema.index({ therapist: 1, slotKeys: 1 }, { unique: true });
sessionSchema.index({ therapist: 1, startAt: 1, status: 1 });

module.exports = mongoose.model("Session", sessionSchema);