const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    // kis user ko notification jayegi
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      // required: true,
      default: null,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      // required: true,
      default: null,
    },

    // kis order ki notification hai
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },

    // notification heading
    title: {
      type: String,
      required: true,
    },

    // notification message
    message: {
      type: String,
      required: true,
    },

    // notification type
    type: {
      type: String,
      // enum: [
      //   "order_placed",
      //   "order_confirmed",
      //   "rider_assigned",
      //   "order_delivered",
      //   "order_cancelled",
      // ],
      default: "system",
    },

    role: {
      type: String,
      // enum: [
      //   "order_placed",
      //   "order_confirmed",
      //   "rider_assigned",
      //   "order_delivered",
      //   "order_cancelled",
      // ],
      default: "user",
    },

    // read/unread
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "Notification",
  notificationSchema
);