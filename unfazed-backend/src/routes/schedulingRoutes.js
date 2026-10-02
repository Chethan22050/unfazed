const express = require("express");
const authMiddleware = require("../middlewere/authMiddleware");
const {
  putAvailability,
  getAvailability,
  getSlots,
  createBooking,
  getTherapistSessions,
  cancelSession,
  updateSessionStatus,
  availabilityRules,
  slotRules,
  bookingRules,
  sessionStatusRules,
  validate
} = require("../controllers/schedulingController");

const router = express.Router();

router.get("/therapists/:slug/slots", slotRules, validate, getSlots);
router.post("/bookings", bookingRules, validate, createBooking);
router.get("/availability", authMiddleware, getAvailability);
router.put("/availability", authMiddleware, availabilityRules, validate, putAvailability);
router.get("/sessions", authMiddleware, getTherapistSessions);
router.patch("/sessions/:id/cancel", authMiddleware, cancelSession);
router.patch("/sessions/:id/status", authMiddleware, sessionStatusRules, validate, updateSessionStatus);

module.exports = router;