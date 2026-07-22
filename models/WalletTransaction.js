// const mongoose = require("mongoose");

// const walletTransactionSchema = new mongoose.Schema(
//   {
//     // The rider or restaurant owner whose wallet this transaction affects
//     userId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       default: null,
//     },
//     restaurantId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Restaurant",
//       default: null,
//     },

//     type: {
//       type: String,
//       enum: ["credit", "debit"],
//       required: true,
//     },
//     amount: { type: Number, required: true, min: 0 },
//     reason: { type: String, default: "" },
//     balanceAfter: { type: Number, required: true },

//     source: {
//       type: String,
//       enum: ["manual", "withdrawal", "order_earning", "refund", "commission"],
//       default: "manual",
//     },

//     createdBy: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       default: null,
//     }, // admin who triggered a manual adjustment, null for system-generated entries
//   },
//   { timestamps: true }
// );

// walletTransactionSchema.index({ userId: 1, createdAt: -1 });
// walletTransactionSchema.index({ restaurantId: 1, createdAt: -1 });

// module.exports = mongoose.model("WalletTransaction", walletTransactionSchema);

const mongoose = require("mongoose");

const walletTransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      default: null,
    },
    type: {
      type: String,
      enum: ["credit", "debit"],
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    reason: { type: String, default: "" },
    balanceAfter: { type: Number, required: true },

    source: {
      type: String,
      enum: [
        "manual", // admin adjustment
        "topup", // rider added money themselves
        "withdrawal", // payout processed
        "order_float", // debited when accepting an order (Option 1)
        "order_earning", // credited on delivery (float refund + delivery fee)
        "order_refund", // float refunded because the order was cancelled
        "session_bonus", // Option 2 bonus payout
      ],
      default: "manual",
    },

    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
    sessionParticipationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RiderSessionParticipation",
      default: null,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    }, // admin who triggered a manual adjustment; null for system-generated entries
  },
  { timestamps: true },
);

walletTransactionSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("WalletTransaction", walletTransactionSchema);
