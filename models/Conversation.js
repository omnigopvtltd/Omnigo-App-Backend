const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        "user_rider",
        "user_admin",
        "rider_admin",
        "vendor_admin",
        "user_vendor",
        "rider_vendor",
      ],
      required: true,
    },

    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    riderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", default: null },

    lastMessage: {
      text: { type: String, default: "" },
      senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      senderRole: {
        type: String,
        enum: ["user", "rider", "vendor", "admin", "ai"],
        default: null,
      },
      sentAt: { type: Date, default: null },
    },

    unreadCount: {
      user: { type: Number, default: 0 },
      rider: { type: Number, default: 0 },
      vendor: { type: Number, default: 0 },
      admin: { type: Number, default: 0 },
    },

    status: { type: String, enum: ["active", "closed"], default: "active" },
  },
  { timestamps: true }
);

conversationSchema.index({ type: 1, userId: 1, riderId: 1, vendorId: 1 });
conversationSchema.index({ "lastMessage.sentAt": -1 });

module.exports = mongoose.model("Conversation", conversationSchema);