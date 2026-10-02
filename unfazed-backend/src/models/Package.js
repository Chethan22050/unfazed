const mongoose = require("mongoose");

const packageSchema = new mongoose.Schema({
  therapist: { type: mongoose.Schema.Types.ObjectId, ref: "Therapist", required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 100 },
  sessionCount: { type: Number, enum: [3, 6, 12], required: true },
  amountPaise: { type: Number, min: 1, required: true },
  validDays: { type: Number, min: 1, max: 730, required: true },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

packageSchema.index({ therapist: 1, isActive: 1 });

module.exports = mongoose.model("Package", packageSchema);