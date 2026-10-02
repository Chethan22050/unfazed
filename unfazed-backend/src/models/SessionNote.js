const mongoose = require("mongoose");

const sessionNoteSchema = new mongoose.Schema({
  therapist: { type: mongoose.Schema.Types.ObjectId, ref: "Therapist", required: true, index: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true, index: true },
  session: { type: mongoose.Schema.Types.ObjectId, ref: "Session", required: true, index: true },
  type: { type: String, enum: ["private", "shared"], required: true, default: "private", index: true },
  format: { type: String, enum: ["freeform", "soap", "dap"], default: "freeform" },
  title: { type: String, trim: true, maxlength: 120, default: "Session note" },
  content: { type: String, maxlength: 30000, default: "" },
  sections: {
    subjective: { type: String, maxlength: 10000, default: "" },
    objective: { type: String, maxlength: 10000, default: "" },
    assessment: { type: String, maxlength: 10000, default: "" },
    plan: { type: String, maxlength: 10000, default: "" },
    data: { type: String, maxlength: 10000, default: "" }
  }
}, { timestamps: true });

sessionNoteSchema.index({ therapist: 1, session: 1, updatedAt: -1 });

module.exports = mongoose.model("SessionNote", sessionNoteSchema);