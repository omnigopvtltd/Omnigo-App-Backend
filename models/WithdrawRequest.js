// const mongoose = require("mongoose");

// const withdrawRequestSchema = new mongoose.Schema(
//   {
//     // Exactly one of these two should be set
//     riderId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       default: null,
//     },
//     restaurantId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Restaurant",
//       default: null,
//     },

//     amount: { type: Number, required: true, min: 1 },
//     method: {
//       type: String,
//       enum: ["bank_transfer", "cash", "mobile_wallet"],
//       default: "bank_transfer",
//     },
//     accountDetails: { type: String, default: "" },

//     status: {
//       type: String,
//       enum: ["pending", "approved", "rejected"],
//       default: "pending",
//     },
//     adminNote: { type: String, default: "" },
//     processedAt: { type: Date, default: null },
//     processedBy: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       default: null,
//     },
//   },
//   { timestamps: true }
// );

// withdrawRequestSchema.pre("validate", function (next) {
//   if (!this.riderId && !this.restaurantId) {
//     return next(new Error("A withdraw request needs either a riderId or a restaurantId"));
//   }
//   if (this.riderId && this.restaurantId) {
//     return next(new Error("A withdraw request cannot belong to both a rider and a restaurant"));
//   }
//   next();
// });

// module.exports = mongoose.model("WithdrawRequest", withdrawRequestSchema);

const mongoose = require("mongoose");

const withdrawRequestSchema = new mongoose.Schema(
  {
    riderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: "Restaurant", default: null },
    amount: { type: Number, required: true, min: 0.01 },
    method: {
      type: String,
      enum: ["jazzcash", "easypaisa", "bank_transfer"],
      required: true,
    },
    accountDetails: {
      accountTitle: { type: String, required: true },
      accountNumber: { type: String, required: true }, // Mobile number for JC/EP, IBAN/Acc for Bank
      bankName: { type: String, default: "" },         // Required if method === "bank_transfer"
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    adminNote: { type: String, default: "" },
    processedAt: { type: Date },
    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("WithdrawRequest", withdrawRequestSchema);