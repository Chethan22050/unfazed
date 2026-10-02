const express = require("express");
const { body, param, validationResult } = require("express-validator");
const authMiddleware = require("../middlewere/authMiddleware");
const clientAuthMiddleware = require("../middlewere/clientAuthMiddleware");
const { listSessionNotes, createSessionNote, updateSessionNote, clientSharedNotes } = require("../controllers/noteController");

const router = express.Router();
const validate = (req, res, next) => {
  const result = validationResult(req);
  if (!result.isEmpty()) return res.status(400).json({ message: "Request validation failed", errors: result.array() });
  return next();
};

router.get("/portal/shared", clientAuthMiddleware, clientSharedNotes);
router.get("/sessions/:sessionId", authMiddleware, [param("sessionId").isMongoId()], validate, listSessionNotes);
router.post("/sessions/:sessionId", authMiddleware, [
  param("sessionId").isMongoId(),
  body("type").isIn(["private", "shared"]),
  body("format").optional().isIn(["freeform", "soap", "dap"]),
  body("title").optional().isString().trim().isLength({ max: 120 }),
  body("content").optional().isString().isLength({ max: 30000 }),
  body("sections").optional().isObject()
], validate, createSessionNote);
router.patch("/:noteId", authMiddleware, [
  param("noteId").isMongoId(),
  body("type").optional().isIn(["private", "shared"]),
  body("format").optional().isIn(["freeform", "soap", "dap"]),
  body("title").optional().isString().trim().isLength({ max: 120 }),
  body("content").optional().isString().isLength({ max: 30000 }),
  body("sections").optional().isObject()
], validate, updateSessionNote);

module.exports = router;