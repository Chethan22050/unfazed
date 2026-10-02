const mongoose = require("mongoose");
const Client = require("../models/Client");
const Payment = require("../models/Payment");
const Session = require("../models/Session");
const { canAccess } = require("../services/entitlementService");

const dashboardSummary = async (req, res) => {
  const therapistId = req.user.id;
  const therapistObjectId = new mongoose.Types.ObjectId(therapistId);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const [activeClients, upcomingSessions, payments] = await Promise.all([
    Client.countDocuments({ therapist: therapistId, status: "active" }),
    Session.countDocuments({ therapist: therapistId, status: { $in: ["confirmed", "pending"] }, startAt: { $gte: now } }),
    Payment.aggregate([
      { $match: { therapist: therapistObjectId, status: "paid", paidAt: { $gte: monthStart } } },
      { $group: { _id: null, totalAmountPaise: { $sum: "$amountPaise" }, paymentCount: { $sum: 1 } } }
    ])
  ]);
  const entitlements = await canAccess(therapistId, "analytics.advanced");
  const summary = {
    activeClients,
    upcomingSessions,
    monthRevenuePaise: payments[0]?.totalAmountPaise || 0,
    monthPaymentCount: payments[0]?.paymentCount || 0,
    currency: process.env.CURRENCY || "INR",
    analyticsDepth: entitlements.tier?.analyticsDepth || "basic"
  };

  if (entitlements.allowed) {
    const [allSessions, noShows] = await Promise.all([
      Session.countDocuments({ therapist: therapistId, startAt: { $gte: monthStart, $lt: now }, status: { $in: ["completed", "no_show"] } }),
      Session.countDocuments({ therapist: therapistId, startAt: { $gte: monthStart, $lt: now }, status: "no_show" })
    ]);
    summary.noShowRate = allSessions ? noShows / allSessions : 0;
  }

  return res.status(200).json({ summary });
};

const revenueTrend = async (req, res) => {
  const therapistObjectId = new mongoose.Types.ObjectId(req.user.id);
  const months = Math.min(Math.max(Number(req.query.months) || 6, 1), 24);
  const from = new Date();
  from.setDate(1);
  from.setMonth(from.getMonth() - months + 1);
  const revenue = await Payment.aggregate([
    { $match: { therapist: therapistObjectId, status: "paid", paidAt: { $gte: from } } },
    { $group: { _id: { year: { $year: "$paidAt" }, month: { $month: "$paidAt" } }, amountPaise: { $sum: "$amountPaise" }, payments: { $sum: 1 } } },
    { $sort: { "_id.year": 1, "_id.month": 1 } }
  ]);
  return res.status(200).json({ revenue, currency: process.env.CURRENCY || "INR" });
};

module.exports = { dashboardSummary, revenueTrend };