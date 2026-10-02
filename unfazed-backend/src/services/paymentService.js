const crypto = require("crypto");
const Payment = require("../models/Payment");
const Session = require("../models/Session");
const ClientPackage = require("../models/ClientPackage");
const Client = require("../models/Client");
const { getRazorpayClient } = require("../config/razorpay");
const { notifyEvent } = require("./notificationService");

const feeBasisPoints = () => {
  const value = Number(process.env.PLATFORM_FEE_BPS || 0);
  return Number.isFinite(value) && value >= 0 ? value : 0;
};

const makeInvoiceNumber = () => `UNF-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

const createPaymentOrder = async ({ therapistId, clientId, sessionId = null, clientPackageId = null, amountPaise }) => {
  if (!Number.isSafeInteger(amountPaise) || amountPaise < 1) throw new Error("A configured price is required");
  const razorpay = getRazorpayClient();
  const provider = razorpay ? "razorpay" : "demo";
  const currency = process.env.CURRENCY || "INR";
  if (!razorpay && process.env.NODE_ENV === "production") throw new Error("Razorpay is not configured");

  const invoiceNumber = makeInvoiceNumber();
  const fee = Math.round(amountPaise * feeBasisPoints() / 10000);
  const order = razorpay
    ? await razorpay.orders.create({ amount: amountPaise, currency, receipt: invoiceNumber })
    : { id: `demo_order_${crypto.randomUUID()}` };

  const payment = await Payment.create({
    therapist: therapistId,
    client: clientId,
    session: sessionId,
    clientPackage: clientPackageId,
    provider,
    gatewayOrderId: order.id,
    amountPaise,
    currency,
    platformFeePaise: fee,
    netAmountPaise: amountPaise - fee,
    invoiceNumber
  });

  return {
    payment,
    order: {
      id: order.id,
      amount: amountPaise,
      currency,
      provider,
      keyId: provider === "razorpay" ? process.env.RAZORPAY_KEY_ID : null
    }
  };
};

const safeEqual = (first, second) => {
  const left = Buffer.from(first || "");
  const right = Buffer.from(second || "");
  return left.length === right.length && crypto.timingSafeEqual(left, right);
};

const verifyCheckoutSignature = (orderId, paymentId, signature) => {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;
  const expected = crypto.createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
  return safeEqual(expected, signature);
};

const markPaymentPaid = async ({ gatewayOrderId, gatewayPaymentId }) => {
  const payment = await Payment.findOneAndUpdate(
    { gatewayOrderId, status: "created" },
    { $set: { status: "paid", gatewayPaymentId, paidAt: new Date() } },
    { returnDocument: "after" }
  );
  if (payment?.session) {
    const session = await Session.findOneAndUpdate(
      { _id: payment.session, status: "pending" },
      { $set: { status: "confirmed" } },
      { returnDocument: "after" }
    );
    const client = await Client.findById(payment.client).select("name email").lean();
    if (session && client) notifyEvent({
      therapistId: payment.therapist,
      client,
      session,
      event: "booking.confirmed",
      eventKey: `booking-confirmed:${session._id}`,
      title: "Appointment confirmed",
      message: `Your ${session.durationMinutes}-minute session is booked.`
    }).catch(() => {});
  }
  if (payment?.clientPackage) {
    await ClientPackage.updateOne({ _id: payment.clientPackage, status: "pending" }, { $set: { status: "active" } });
    const client = await Client.findById(payment.client).select("name email").lean();
    if (client) notifyEvent({
      therapistId: payment.therapist,
      client,
      event: "package.purchased",
      eventKey: `package-purchased:${payment.clientPackage}`,
      title: "Session package activated",
      message: "Your session package is active and ready to use."
    }).catch(() => {});
  }
  return payment || Payment.findOne({ gatewayOrderId });
};

const verifyWebhookSignature = (rawBody, signature) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqual(expected, signature);
};

module.exports = { createPaymentOrder, verifyCheckoutSignature, markPaymentPaid, verifyWebhookSignature };