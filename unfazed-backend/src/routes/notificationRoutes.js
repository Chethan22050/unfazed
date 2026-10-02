const express = require("express");
const { param, validationResult } = require("express-validator");
const authMiddleware = require("../middlewere/authMiddleware");
const { listNotifications, markRead } = require("../controllers/notificationController");

const router = express.Router();
const validate = (req, res, next) => {
  const result = validationResult(req);
  if (!result.isEmpty()) return res.status(400).json({ message: "Request validation failed", errors: result.array() });
  return next();
};

router.get("/", authMiddleware, listNotifications);
router.patch("/:id/read", authMiddleware, [param("id").isMongoId()], validate, markRead);

module.exports = router;