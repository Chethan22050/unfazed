const express = require("express");
const { query, validationResult } = require("express-validator");
const authMiddleware = require("../middlewere/authMiddleware");
const { listTiers, currentEntitlements, checkFeature } = require("../controllers/entitlementController");

const router = express.Router();
const validate = (req, res, next) => {
  const result = validationResult(req);
  if (!result.isEmpty()) return res.status(400).json({ message: "Request validation failed", errors: result.array() });
  return next();
};

router.get("/tiers", listTiers);
router.get("/me", authMiddleware, currentEntitlements);
router.get("/check", authMiddleware, [query("featureKey").isIn(["clients.active", "notes.soap", "notes.dap", "analytics.basic", "analytics.advanced", "payments.packages", "client.portal"])], validate, checkFeature);

module.exports = router;