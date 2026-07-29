const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["customer_rider", "customer_admin", "rider_admin", "admin_user", "admin_rider"],
      required: true,
    },

    // Populated based on `type` — e.g. customer_rider uses customerId +
    // riderId, customer_admin uses customerId + adminId, etc. Whichever
    // pair applies, the third stays null. Every conversation is readable by
    // any admin regardless of type — admins can see all three chat types.
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    riderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", default: null },

    lastMessage: {
      text: { type: String, default: "" },
      senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      senderRole: { type: String, enum: ["user", "rider", "admin"], default: null },
      sentAt: { type: Date, default: null },
    },

    // Per-participant unread counters, keyed by role so admins joining a
    // customer_rider thread don't interfere with the customer's/rider's own count.
    unreadCount: {
      customer: { type: Number, default: 0 },
      rider: { type: Number, default: 0 },
      admin: { type: Number, default: 0 },
    },

    status: { type: String, enum: ["active", "closed"], default: "active" },
  },
  { timestamps: true }
);

conversationSchema.index({ type: 1, customerId: 1, riderId: 1 });
conversationSchema.index({ "lastMessage.sentAt": -1 });

module.exports = mongoose.model("Conversation", conversationSchema);