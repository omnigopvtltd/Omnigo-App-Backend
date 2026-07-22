const mongoose = require("mongoose");

const campaignSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    bannerImage: { type: String, default: "" },

    type: {
      type: String,
      enum: ["banner", "push_notification", "email"],
      default: "banner",
    },

    linkedCoupon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Coupon",
      default: null,
    },

    targetAudience: {
      type: String,
      enum: ["all", "new_users", "inactive_users"],
      default: "all",
    },

    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// campaignSchema.pre("validate", function (next) {
campaignSchema.pre("validate", function () {
  if (this.endDate < this.startDate) {
    return next(new Error("endDate must be after startDate"));
  }
//   next();
});

module.exports = mongoose.model("Campaign", campaignSchema);