const mongoose = require("mongoose");

const riderSessionParticipationSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RiderSession",
      required: true,
    },
    riderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    status: {
      type: String,
      enum: ["in_progress", "completed", "abandoned"],
      default: "in_progress",
    },

    ordersCompleted: { type: Number, default: 0 },
    orderIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }],

    bonusAmount: { type: Number, required: true }, // snapshot from the session at join time
    requiredOrders: { type: Number, required: true }, // snapshot from the session at join time
    bonusPaid: { type: Boolean, default: false },

    joinedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    abandonedAt: { type: Date, default: null },
    abandonReason: { type: String, default: "" },
  },
  { timestamps: true }
);

// A rider can only have one active (in_progress) participation at a time.
riderSessionParticipationSchema.index(
  { riderId: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: "in_progress" } }
);

module.exports = mongoose.model("RiderSessionParticipation", riderSessionParticipationSchema);