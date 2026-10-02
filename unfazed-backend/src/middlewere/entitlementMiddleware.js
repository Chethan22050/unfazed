const { requireEntitlement } = require("../services/entitlementService");

const entitlementMiddleware = (featureKey, contextFactory) => async (req, res, next) => {
  try {
    const context = contextFactory ? contextFactory(req) : {};
    await requireEntitlement(req.user.id, featureKey, context);
    return next();
  } catch (error) {
    return res.status(error.status || 500).json({
      message: error.message || "Could not verify feature access",
      code: error.code,
      featureKey: error.featureKey,
      tier: error.tier,
      upgradeRequired: error.code === "ENTITLEMENT_REQUIRED"
    });
  }
};

module.exports = entitlementMiddleware;