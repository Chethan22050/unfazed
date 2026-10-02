const SubscriptionTierConfig = require("../models/SubscriptionTierConfig");

const defaultTiers = [
  {
    key: "foundation",
    name: "Foundation",
    description: "Core tools for a growing independent practice.",
    activeClientCap: Number(process.env.FOUNDATION_CLIENT_CAP) || 25,
    analyticsDepth: "basic",
    isDefault: true,
    features: [
      { key: "clients.active", enabled: true },
      { key: "notes.soap", enabled: false },
      { key: "notes.dap", enabled: false },
      { key: "analytics.basic", enabled: true },
      { key: "analytics.advanced", enabled: false },
      { key: "payments.packages", enabled: true },
      { key: "client.portal", enabled: true }
    ]
  },
  {
    key: "practice",
    name: "Practice",
    description: "Expanded capacity and deeper practice insights.",
    activeClientCap: Number(process.env.PRACTICE_CLIENT_CAP) || 1000,
    analyticsDepth: "advanced",
    isDefault: false,
    features: [
      { key: "clients.active", enabled: true },
      { key: "notes.soap", enabled: true },
      { key: "notes.dap", enabled: true },
      { key: "analytics.basic", enabled: true },
      { key: "analytics.advanced", enabled: true },
      { key: "payments.packages", enabled: true },
      { key: "client.portal", enabled: true }
    ]
  }
];

const seedDefaultTiers = async () => {
  for (const tier of defaultTiers) {
    await SubscriptionTierConfig.updateOne(
      { key: tier.key },
      { $setOnInsert: tier },
      { upsert: true }
    );
  }
};

module.exports = { seedDefaultTiers };