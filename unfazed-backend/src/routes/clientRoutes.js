const express = require("express");
const { body, param, query, validationResult } = require("express-validator");
const authMiddleware = require("../middlewere/authMiddleware");
const { submitIntake, listClients, getClient, updateClient, createPortalLink } = require("../controllers/clientController");

const router = express.Router();

const validate = (req, res, next) => {
  const result = validationResult(req);
  if (!result.isEmpty()) return res.status(400).json({ message: "Request validation failed", errors: result.array() });
  return next();
};

router.post("/intake/:slug", [
  param("slug").isString().trim().notEmpty(),
  body("name").isString().trim().isLength({ min: 2, max: 100 }),
  body("email").isEmail().normalizeEmail(),
  body("phone").optional().isString().isLength({ max: 32 }),
  body("presentingConcern").optional().isString().isLength({ max: 4000 }),
  body("history").optional().isString().isLength({ max: 8000 }),
  body("demographics").optional().isObject(),
  body("consentAccepted").equals("true").withMessage("Consent is required before submitting intake")
], validate, submitIntake);

router.get("/", authMiddleware, [
  query("status").optional().isIn(["lead", "active", "archived"]),
  query("sort").optional().isIn(["name", "createdAt", "lastSessionAt"]),
  query("direction").optional().isIn(["asc", "desc"])
], validate, listClients);

router.post("/:id/portal-link", authMiddleware, [param("id").isMongoId()], validate, createPortalLink);
router.get("/:id", authMiddleware, [param("id").isMongoId()], validate, getClient);
router.patch("/:id", authMiddleware, [
  param("id").isMongoId(),
  body("status").optional().isIn(["lead", "active", "archived"]),
  body("tags").optional().isArray({ max: 20 }),
  body("tags.*").optional().isString().trim().isLength({ max: 40 }),
  body("phone").optional().isString().isLength({ max: 32 })
], validate, updateClient);

module.exports = router;