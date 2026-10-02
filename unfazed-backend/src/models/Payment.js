const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  therapist: { type: mongoose.Schema.Types.ObjectId, ref: "Therapist", required: true, index: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true, index: true },
  session: { type: mongoose.Schema.Types.ObjectId, ref: "Session", default: null, index: true },
  clientPackage: { type: mongoose.Schema.Types.ObjectId, ref: "ClientPackage", default: null },
  provider: { type: String, enum: ["razorpay", "demo"], required: true },
  gatewayOrderId: { type: String, required: true, unique: true },
  gatewayPaymentId: { type: String, default: "", index: true },
  amountPaise: { type: Number, min: 1, required: true },
  currency: { type: String, default: process.env.CURRENCY || "INR", uppercase: true },
  platformFeePaise: { type: Number, min: 0, required: true },
  netAmountPaise: { type: Number, min: 0, required: true },
  status: { type: String, enum: ["created", "paid", "failed", "refunded"], default: "created", index: true },
  paidAt: { type: Date, default: null },
  invoiceNumber: { type: String, required: true, unique: true }
}, { timestamps: true });

module.exports = mongoose.model("Payment", paymentSchema);