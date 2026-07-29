const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["DEPOSIT", "WITHDRAWAL", "COMMISSION", "ORDER_PAYMENT"], required: true },
    paymentMethod: { type: String, enum: ["JAZZCASH", "EASYPAISA", "BANK_TRANSFER"], required: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ["PENDING", "COMPLETED", "FAILED", "REJECTED"], default: "PENDING" },
    accountDetails: {
      accountTitle: String,
      accountNumber: String,
      bankName: String,
      iban: String,
    },
    transactionRef: String, // Gateway Ref ID
    adminNote: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Transaction", transactionSchema);