const Client = require("../models/Client");
const SubscriptionTierConfig = require("../models/SubscriptionTierConfig");
const Therapist = require("../models/Therapist");

const loadTherapistTier = async (therapistId) => {
  const therapist = await Therapist.findById(therapistId).select("subscriptionTier").populate("subscriptionTier").lean();
  if (!therapist) return { therapist: null, tier: null };
  const tier = therapist.subscriptionTier || await SubscriptionTierConfig.findOne({ isDefault: true, isActive: true }).lean();
  return { therapist, tier };
};

const canAccess = async (therapistId, featureKey, context = {}) => {
  const { therapist, tier } = await loadTherapistTier(therapistId);
  if (!therapist || !tier) return { allowed: false, reason: "Subscription configuration is unavailable", featureKey, tier: null };

  const feature = tier.features.find((item) => item.key === featureKey);
  let allowed = Boolean(feature?.enabled);
  let reason = allowed ? "" : "This feature is not included in the current subscription";

  if (featureKey === "clients.active" && context.newActiveClient && allowed) {
    const activeClients = await Client.countDocuments({ therapist: therapistId, status: "active" });
    allowed = activeClients < tier.activeClientCap;
    if (!allowed) reason = "Your active-client limit has been reached";
  }

  return {
    allowed,
    reason,
    featureKey,
    tier: { key: tier.key, name: tier.name, activeClientCap: tier.activeClientCap, analyticsDepth: tier.analyticsDepth },
    upgradeAvailable: !allowed
  };
};

const requireEntitlement = async (therapistId, featureKey, context) => {
  const result = await canAccess(therapistId, featureKey, context);
  if (!result.allowed) {
    const error = new Error(result.reason);
    error.status = 403;
    error.code = "ENTITLEMENT_REQUIRED";
    error.featureKey = featureKey;
    error.tier = result.tier;
    throw error;
  }
  return result;
};

const getEntitlements = async (therapistId) => {
  const { tier } = await loadTherapistTier(therapistId);
  if (!tier) return null;
  const activeClientCount = await Client.countDocuments({ therapist: therapistId, status: "active" });
  return {
    tier: { key: tier.key, name: tier.name, description: tier.description, activeClientCap: tier.activeClientCap, analyticsDepth: tier.analyticsDepth },
    features: tier.features,
    usage: { activeClients: activeClientCount, activeClientCap: tier.activeClientCap }
  };
};

module.exports = { canAccess, requireEntitlement, getEntitlements };