const mongoose = require("mongoose");

const clientSchema = new mongoose.Schema({
  therapist: { type: mongoose.Schema.Types.ObjectId, ref: "Therapist", required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, lowercase: true, trim: true },
  phone: { type: String, trim: true, default: "" },
  status: { type: String, enum: ["lead", "active", "archived"], default: "active", index: true },
  tags: { type: [String], default: [] },
  intake: {
    demographics: { type: mongoose.Schema.Types.Mixed, default: {} },
    presentingConcern: { type: String, default: "", maxlength: 4000 },
    history: { type: String, default: "", maxlength: 8000 }
  },
  consent: {
    accepted: { type: Boolean, default: false },
    acceptedAt: { type: Date, default: null },
    version: { type: String, default: "intake-v1" }
  },
  lastSessionAt: { type: Date, default: null, index: true }
}, { timestamps: true });

clientSchema.index({ therapist: 1, email: 1 }, { unique: true });
clientSchema.index({ therapist: 1, name: 1 });

module.exports = mongoose.model("Client", clientSchema);