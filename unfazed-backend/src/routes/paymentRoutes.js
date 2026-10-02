const express = require("express");
const authMiddleware = require("../middlewere/authMiddleware");
const {
  createPackage,
  listTherapistPackages,
  listPublicPackages,
  purchasePackage,
  confirmPayment,
  razorpayWebhook,
  listPayments,
  downloadInvoice,
  packageRules,
  purchaseRules,
  paymentRules,
  validate
} = require("../controllers/paymentController");

const router = express.Router();

router.get("/therapists/:slug/packages", listPublicPackages);
router.post("/packages/:packageId/purchase", purchaseRules, validate, purchasePackage);
router.post("/webhook", razorpayWebhook);
router.post("/:paymentId/confirm", paymentRules, validate, confirmPayment);
router.get("/", authMiddleware, listPayments);
router.get("/packages", authMiddleware, listTherapistPackages);
router.post("/packages", authMiddleware, packageRules, validate, createPackage);
router.get("/:paymentId/invoice", authMiddleware, paymentRules, validate, downloadInvoice);

module.exports = router;