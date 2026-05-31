const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // OTP channel
    type: {
      type: String,
      enum: ["phone", "email"],
      required: true,
    },

    // OTP purpose (VERY IMPORTANT)
    purpose: {
      type: String,
      enum: [
        "signup",
        "login",
        "forgot-password",
        "phone-verification",
        "email-verification",
      ],
      required: true,
    },

    phone: {
      type: String,
      default: null,
    },

    email: {
      type: String,
      default: null,
    },

    otp: {
      type: String,
      required: true,
    },

    expiresAt: {
      type: Date,
      required: true,
    },

    verified: {
      type: Boolean,
      default: false,
    },

    attempts: {
      type: Number,
      default: 0,
    },

    // security improvement
    isUsed: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Auto-delete expired OTPs (recommended)
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("OTP", otpSchema);