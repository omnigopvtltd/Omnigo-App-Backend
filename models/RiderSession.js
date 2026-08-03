const mongoose = require("mongoose");

const riderSessionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    status: {
      type: String,
      enum: ["in_progress", "booked", "completed", "expired", "cancelled"],
      default: "in_progress",
    },
    
    requiredOrders: { type: Number, required: true, min: 1, default: 6 },
    bonusAmount: { type: Number, required: true, min: 0 },

    // Optional wallet minimum a rider must hold to join (acts like the same
    // "commitment" idea as the order float in Option 1).
    minWalletBalance: { type: Number, default: 0 },

    // Optional time limit to finish once joined, in hours. Null = no limit.
    timeLimitHours: { type: Number, default: null },

    isActive: { type: Boolean, default: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
  },
  { timestamps: true },
);

// riderSessionSchema.pre("validate", function (next) {
riderSessionSchema.pre("validate", function () {
  if (this.endDate < this.startDate) {
    return next(new Error("endDate must be after startDate"));
  }
  // next();
});

riderSessionSchema.methods.isCurrentlyJoinable = function () {
  const now = new Date();
  return this.isActive && now >= this.startDate && now <= this.endDate;
};

module.exports = mongoose.model("RiderSession", riderSessionSchema);
