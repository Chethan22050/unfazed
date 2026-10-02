const mongoose = require("mongoose");

const weeklyWindowSchema = new mongoose.Schema({
  dayOfWeek: { type: Number, min: 0, max: 6, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true }
}, { _id: false });

const availabilityOverrideSchema = new mongoose.Schema({
  date: { type: String, required: true },
  type: { type: String, enum: ["available", "blocked"], required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true }
}, { _id: false });

const sessionRateSchema = new mongoose.Schema({
  durationMinutes: { type: Number, enum: [30, 45, 60, 90], required: true },
  amountPaise: { type: Number, min: 1, required: true }
}, { _id: false });

const availabilitySchema = new mongoose.Schema({
  therapist: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Therapist",
    required: true,
    unique: true,
    index: true
  },
  timezone: { type: String, required: true, default: "Asia/Kolkata" },
  weekly: { type: [weeklyWindowSchema], default: [] },
  overrides: { type: [availabilityOverrideSchema], default: [] },
  sessionDurations: { type: [Number], default: [30, 45, 60, 90] },
  sessionRates: { type: [sessionRateSchema], default: [] },
  bufferMinutes: { type: Number, min: 0, max: 120, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model("Availability", availabilitySchema);