const mongoose = require("mongoose");

const featureSchema = new mongoose.Schema({
  key: { type: String, required: true },
  enabled: { type: Boolean, required: true, default: false }
}, { _id: false });

const subscriptionTierConfigSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, default: "" },
  activeClientCap: { type: Number, min: 1, required: true },
  analyticsDepth: { type: String, enum: ["basic", "advanced"], default: "basic" },
  features: { type: [featureSchema], default: [] },
  isDefault: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

subscriptionTierConfigSchema.index({ isDefault: 1, isActive: 1 });

module.exports = mongoose.model("SubscriptionTierConfig", subscriptionTierConfigSchema);