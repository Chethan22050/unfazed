const SubscriptionTierConfig = require("../models/SubscriptionTierConfig");
const { canAccess, getEntitlements } = require("../services/entitlementService");

const listTiers = async (req, res) => {
  const tiers = await SubscriptionTierConfig.find({ isActive: true })
    .select("key name description activeClientCap analyticsDepth features")
    .sort({ activeClientCap: 1 })
    .lean();
  return res.status(200).json({ tiers });
};

const currentEntitlements = async (req, res) => {
  const entitlements = await getEntitlements(req.user.id);
  if (!entitlements) return res.status(404).json({ message: "Subscription configuration is not available" });
  return res.status(200).json({ entitlements });
};

const checkFeature = async (req, res) => {
  const result = await canAccess(req.user.id, req.query.featureKey);
  return res.status(result.allowed ? 200 : 403).json({ ...result, upgradeRequired: !result.allowed });
};

module.exports = { listTiers, currentEntitlements, checkFeature };