const express = require("express");
const authMiddleware = require("../middlewere/authMiddleware");
const { body } = require("express-validator");
const validateRequest = require("../utils/validateRequest");
const {
  registerTherapist,
  loginTherapist
} = require("../controllers/authcontroller");
const {
  getCurrentTherapist,
  updateTherapistProfile
} = require("../controllers/therapistController");

const router = express.Router();

// Therapist registration
router.post("/register", [
  body("email").isString().trim().isEmail().withMessage("A valid email is required").normalizeEmail(),
  body("password").isString().isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
  body("name").isString().trim().notEmpty().withMessage("Name is required"),
  body("slug").optional({ checkFalsy: true }).isString().trim().matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).withMessage("Slug must contain lowercase letters, numbers, and hyphens"),
  body("bio").optional().isString().withMessage("Bio must be text"),
  body("specializations").optional().isArray().withMessage("Specializations must be an array"),
  body("specializations.*").optional().isString().trim().notEmpty(),
  body("languages").optional().isArray().withMessage("Languages must be an array"),
  body("languages.*").optional().isString().trim().notEmpty(),
  body("services").optional().isArray().withMessage("Services must be an array"),
  body("services.*.title").isString().trim().notEmpty().withMessage("Each service needs a title"),
  body("services.*.description").optional().isString().withMessage("Service descriptions must be text")
], validateRequest, registerTherapist);

// Therapist login
router.post("/login", [
  body("email").isString().trim().isEmail().withMessage("A valid email is required").normalizeEmail(),
  body("password").isString().notEmpty().withMessage("Password is required")
], validateRequest, loginTherapist);

const profileUpdateValidation = [
  body("name").optional().isString().trim().notEmpty().withMessage("Name cannot be empty"),
  body("slug").optional().isString().trim().matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).withMessage("Slug must contain lowercase letters, numbers, and hyphens"),
  body("bio").optional().isString().withMessage("Bio must be text"),
  body("specializations").optional().isArray().withMessage("Specializations must be an array"),
  body("specializations.*").optional().isString().trim().notEmpty(),
  body("languages").optional().isArray().withMessage("Languages must be an array"),
  body("languages.*").optional().isString().trim().notEmpty(),
  body("services").optional().isArray().withMessage("Services must be an array"),
  body("services.*.title").isString().trim().notEmpty().withMessage("Each service needs a title"),
  body("services.*.description").optional().isString().withMessage("Service descriptions must be text")
];

router.get("/profile", authMiddleware, getCurrentTherapist);
router.put("/profile", authMiddleware, profileUpdateValidation, validateRequest, updateTherapistProfile);

module.exports = router;