const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: { type: String, default: "" },

    type: {
      type: String,
      enum: ["percentage", "fixed", "free_delivery", "cashback"],
      required: true,
    },
    value: { type: Number, required: true, min: 0 }, // % for percentage/cashback, currency amount for fixed; ignored for free_delivery
    maxDiscount: { type: Number, default: null }, // caps percentage/cashback discounts

    minOrderAmount: { type: Number, default: 0 },
    usageLimit: { type: Number, default: null }, // total redemptions allowed, null = unlimited
    usedCount: { type: Number, default: 0 },
    perUserLimit: { type: Number, default: 1 },

    applicableRestaurants: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Restaurant" },
    ], // empty array = valid platform-wide

    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

couponSchema.pre("validate", function () {
  if (this.endDate < this.startDate) {
    return next(new Error("endDate must be after startDate"));
  }
//   next();
});

couponSchema.methods.isCurrentlyValid = function () {
  const now = new Date();
  return (
    this.isActive &&
    now >= this.startDate &&
    now <= this.endDate &&
    (this.usageLimit === null || this.usedCount < this.usageLimit)
  );
};

module.exports = mongoose.model("Coupon", couponSchema);