// models/RiderBikeLoan.js
const mongoose = require("mongoose");

const riderBikeLoanSchema = new mongoose.Schema(
  {
    riderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // or "Rider"
      required: true,
      unique: true,
    },
    totalAmount: {
      type: Number,
      required: true, // e.g., 200000 (total price of the bike)
    },
    dailyInstallment: {
      type: Number,
      default: 500, // 500 daily
    },
    paidAmount: {
      type: Number,
      default: 0,
    },
    remainingAmount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "COMPLETED", "PAUSED"],
      default: "ACTIVE",
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("RiderBikeLoan", riderBikeLoanSchema);