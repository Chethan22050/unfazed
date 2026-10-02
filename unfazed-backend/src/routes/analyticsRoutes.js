const express = require("express");
const { query, validationResult } = require("express-validator");
const authMiddleware = require("../middlewere/authMiddleware");
const entitlementMiddleware = require("../middlewere/entitlementMiddleware");
const { dashboardSummary, revenueTrend } = require("../controllers/analyticsController");

const router = express.Router();
const validate = (req, res, next) => {
  const result = validationResult(req);
  if (!result.isEmpty()) return res.status(400).json({ message: "Request validation failed", errors: result.array() });
  return next();
};

router.get("/dashboard", authMiddleware, entitlementMiddleware("analytics.basic"), dashboardSummary);
router.get("/revenue", authMiddleware, [query("months").optional().isInt({ min: 1, max: 24 }).toInt()], validate, entitlementMiddleware("analytics.advanced"), revenueTrend);

module.exports = router;