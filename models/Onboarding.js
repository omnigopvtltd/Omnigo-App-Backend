const mongoose = require("mongoose");

const onboardingSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    image_url: {
      type: String,
      required: true,
    },

    order: {
      type: Number,
      required: true,
      default: 1,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "Onboarding",
  onboardingSchema
);