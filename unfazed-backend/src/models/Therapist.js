const mongoose = require("mongoose");

const therapistSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    password_hash: {
      type: String,
      required: true
    },

    name: {
      type: String,
      required: true,
      trim: true
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    bio: {
      type: String,
      default: ""
    },

    specializations: {
      type: [String],
      default: []
    },

    languages: {
      type: [String],
      default: []
    },
    services: {
      type: [{
        title: {
          type: String,
          required: true,
          trim: true
        },
        description: {
          type: String,
          default: "",
          trim: true
        }
      }],
      default: []
    },
    subscriptionTier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubscriptionTierConfig",
      default: null
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Therapist", therapistSchema);