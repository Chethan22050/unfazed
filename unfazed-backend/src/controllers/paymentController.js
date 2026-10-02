const { body, param, validationResult } = require("express-validator");
const Client = require("../models/Client");
const ClientPackage = require("../models/ClientPackage");
const Package = require("../models/Package");
const Payment = require("../models/Payment");
const Therapist = require("../models/Therapist");
const { createPaymentOrder, markPaymentPaid, verifyCheckoutSignature, verifyWebhookSignature } = require("../services/paymentService");
const { createInvoice } = require("../services/invoiceService");
const { canAccess } = require("../services/entitlementService");

const validate = (req, res, next) => {
  const result = validationResult(req);
  if (!result.isEmpty()) return res.status(400).json({ message: "Request validation failed", errors: result.array() });
  return next();
};

const createPackage = async (req, res) => {
  const access = await canAccess(req.user.id, "payments.packages");
  if (!access.allowed) return res.status(403).json({ message: access.reason, code: "ENTITLEMENT_REQUIRED", featureKey: access.featureKey, tier: access.tier, upgradeRequired: true });
  const plan = await Package.create({ therapist: req.user.id, ...req.body });
  return res.status(201).json({ package: plan });
};

const listTherapistPackages = async (req, res) => {
  const packages = await Package.find({ therapist: req.user.id }).sort({ createdAt: -1 }).lean();
  return res.status(200).json({ packages });
};

const listPublicPackages = async (req, res) => {
  const therapist = await Therapist.findOne({ slug: req.params.slug.toLowerCase() }).select("_id").lean();
  if (!therapist) return res.status(404).json({ message: "Therapist profile not found" });
  const packages = await Package.find({ therapist: therapist._id, isActive: true })
    .select("title sessionCount amountPaise validDays")
    .lean();
  return res.status(200).json({ packages, currency: process.env.CURRENCY || "INR" });
};

const purchasePackage = async (req, res) => {
  try {
    const plan = await Package.findOne({ _id: req.params.packageId, isActive: true });
    if (!plan) return res.status(404).json({ message: "Package not found" });
    const access = await canAccess(plan.therapist, "payments.packages");
    if (!access.allowed) return res.status(403).json({ message: access.reason, code: "ENTITLEMENT_REQUIRED", featureKey: access.featureKey, tier: access.tier, upgradeRequired: true });
    const email = req.body.email.trim().toLowerCase();
    const client = await Client.findOneAndUpdate(
      { therapist: plan.therapist, email },
      { $setOnInsert: { therapist: plan.therapist, email, name: req.body.name.trim(), phone: req.body.phone || "", status: "lead" } },
      { returnDocument: "after", upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    const clientPackage = await ClientPackage.create({
      therapist: plan.therapist,
      client: client._id,
      package: plan._id,
      sessionCount: plan.sessionCount,
      sessionsRemaining: plan.sessionCount,
      amountPaise: plan.amountPaise,
      expiresAt: new Date(Date.now() + plan.validDays * 86400000),
      status: "pending"
    });
    const { payment, order } = await createPaymentOrder({
      therapistId: plan.therapist,
      clientId: client._id,
      clientPackageId: clientPackage._id,
      amountPaise: plan.amountPaise
    });
    return res.status(201).json({ clientPackage, payment: { id: payment._id }, order });
  } catch (error) {
    return res.status(503).json({ message: error.message || "Unable to start package payment" });
  }
};

const confirmPayment = async (req, res) => {
  const payment = await Payment.findById(req.params.paymentId);
  if (!payment) return res.status(404).json({ message: "Payment not found" });
  if (payment.status === "paid") return res.status(200).json({ message: "Payment already confirmed", payment });

  if (payment.provider === "demo") {
    if (process.env.NODE_ENV === "production") return res.status(403).json({ message: "Demo payment confirmation is disabled" });
    const paid = await markPaymentPaid({ gatewayOrderId: payment.gatewayOrderId, gatewayPaymentId: `demo_payment_${payment._id}` });
    return res.status(200).json({ message: "Demo payment confirmed", payment: paid });
  }

  const { orderId, paymentId, signature } = req.body;
  if (orderId !== payment.gatewayOrderId || !verifyCheckoutSignature(orderId, paymentId, signature)) {
    return res.status(400).json({ message: "Payment signature is invalid" });
  }
  const paid = await markPaymentPaid({ gatewayOrderId: orderId, gatewayPaymentId: paymentId });
  return res.status(200).json({ message: "Payment confirmed", payment: paid });
};

const razorpayWebhook = async (req, res) => {
  const signature = req.headers["x-razorpay-signature"];
  if (!Buffer.isBuffer(req.body) || !verifyWebhookSignature(req.body, signature)) {
    return res.status(401).json({ message: "Invalid webhook signature" });
  }
  try {
    const event = JSON.parse(req.body.toString("utf8"));
    const paymentEntity = event.payload?.payment?.entity;
    if (["payment.captured", "order.paid"].includes(event.event) && paymentEntity?.order_id) {
      await markPaymentPaid({ gatewayOrderId: paymentEntity.order_id, gatewayPaymentId: paymentEntity.id });
    }
    return res.status(200).json({ received: true });
  } catch {
    return res.status(400).json({ message: "Webhook payload is invalid" });
  }
};

const listPayments = async (req, res) => {
  const payments = await Payment.find({ therapist: req.user.id })
    .populate("client", "name email")
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();
  return res.status(200).json({ payments, currency: process.env.CURRENCY || "INR" });
};

const downloadInvoice = async (req, res) => {
  const payment = await Payment.findOne({ _id: req.params.paymentId, therapist: req.user.id })
    .populate("client", "name email")
    .populate("therapist", "name");
  if (!payment) return res.status(404).json({ message: "Payment not found" });
  if (payment.status !== "paid") return res.status(409).json({ message: "Invoice is available after payment is confirmed" });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${payment.invoiceNumber}.pdf"`);
  createInvoice({ payment, client: payment.client, therapist: payment.therapist }).pipe(res);
};

const packageRules = [
  body("title").isString().trim().isLength({ min: 2, max: 100 }),
  body("sessionCount").isIn([3, 6, 12]).toInt(),
  body("amountPaise").isInt({ min: 1 }).toInt(),
  body("validDays").isInt({ min: 1, max: 730 }).toInt(),
  body("isActive").optional().isBoolean().toBoolean()
];

const purchaseRules = [
  param("packageId").isMongoId(),
  body("name").isString().trim().isLength({ min: 2, max: 100 }),
  body("email").isEmail().normalizeEmail(),
  body("phone").optional().isString().isLength({ max: 32 })
];

const paymentRules = [param("paymentId").isMongoId()];

module.exports = {
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
};