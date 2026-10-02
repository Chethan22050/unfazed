const express = require("express");
const { param, validationResult } = require("express-validator");
const authMiddleware = require("../middlewere/authMiddleware");
const clientAuthMiddleware = require("../middlewere/clientAuthMiddleware");
const { listTherapistMessages, listClientMessages } = require("../controllers/chatController");

const router = express.Router();
const validate = (req, res, next) => {
  const result = validationResult(req);
  if (!result.isEmpty()) return res.status(400).json({ message: "Request validation failed", errors: result.array() });
  return next();
};

router.get("/clients/:clientId/messages", authMiddleware, [param("clientId").isMongoId()], validate, listTherapistMessages);
router.get("/portal/messages", clientAuthMiddleware, listClientMessages);

module.exports = router;