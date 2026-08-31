const mongoose = require("mongoose");

// FAQ Schema
const faqSchema = new mongoose.Schema(
  {
    question: { type: String, required: true, trim: true },
    answer: { type: String, required: true },
    category: { type: String, default: "Account", trim: true }, // e.g. Account, Orders, Payments
    targetRole: {
      type: String,
      enum: ["user", "rider", "vendor", "all"],
      default: "all",
      lowercase: true,
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Terms & Conditions Schema
const termsSchema = new mongoose.Schema(
  {
    title: { type: String, default: "Instructions to follow" },
    content: { type: String, required: true }, // Supports HTML / Plain Text Clauses
    targetRole: {
      type: String,
      enum: ["user", "rider", "vendor", "all"],
      default: "all",
      lowercase: true,
    },
    version: { type: Number, default: 1.0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const FAQ = mongoose.model("FAQ", faqSchema);
const Terms = mongoose.model("Terms", termsSchema);

module.exports = { FAQ, Terms };