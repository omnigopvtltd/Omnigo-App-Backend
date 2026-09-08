const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    // Dynamic Reference according to role
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "recipientModel",
    },
    recipientModel: {
      type: String,
      required: true,
      enum: ["User", "Vendor", "Rider", "Admin"],
      default: "User",
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ["order", "rider", "vendor", "system", "payout", "product"],
      default: "system",
    },
    data: { type: Object, default: {} }, // Pass orderId, vendorId, payload etc.
    link: { type: String, default: "" }, // Deep link or screen navigation
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);