const mongoose = require("mongoose");

const clientPackageSchema = new mongoose.Schema({
  therapist: { type: mongoose.Schema.Types.ObjectId, ref: "Therapist", required: true, index: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true, index: true },
  package: { type: mongoose.Schema.Types.ObjectId, ref: "Package", required: true },
  sessionCount: { type: Number, required: true },
  sessionsRemaining: { type: Number, required: true },
  amountPaise: { type: Number, required: true },
  expiresAt: { type: Date, required: true },
  status: { type: String, enum: ["pending", "active", "expired", "exhausted"], default: "pending", index: true }
}, { timestamps: true });

module.exports = mongoose.model("ClientPackage", clientPackageSchema);