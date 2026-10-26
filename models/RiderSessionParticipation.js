// const mongoose = require("mongoose");

// const riderSessionParticipationSchema = new mongoose.Schema(
//   {
//     sessionId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "RiderSession",
//       required: true,
//     },
//     riderId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       required: true,
//     },

//     status: {
//       type: String,
//       enum: ["in_progress", "booked", "completed", "expired", "cancelled", "abandoned"],
//       default: "in_progress",
//     },

//     ordersCompleted: { type: Number, default: 0 },
//     orderIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }],

//     bonusAmount: { type: Number, required: true }, // snapshot from the session at join time
//     requiredOrders: { type: Number, required: true }, // snapshot from the session at join time
//     timeLimitHours: { type: Number}, // snapshot from the session at join time
//     extendHours: { type: Number }, // snapshot from the session at join time
//     isExtend12: { type: Boolean, default: false }, // snapshot from the session at join time
//     isExtend16: { type: Boolean, default: false }, // snapshot from the session at join time
//     bonusPaid: { type: Boolean, default: false },

//     joinedAt: { type: Date, default: Date.now },
//     expiresAt: { type: Date, default: null },
//     completedAt: { type: Date, default: null },
//     abandonedAt: { type: Date, default: null },
//     abandonReason: { type: String, default: "" },
//   },
//   { timestamps: true }
// );

// // A rider can only have one active (in_progress) participation at a time.
// riderSessionParticipationSchema.index(
//   { riderId: 1, status: 1 },
//   { unique: true, partialFilterExpression: { status: "in_progress" } }
// );

// module.exports = mongoose.model("RiderSessionParticipation", riderSessionParticipationSchema);

//////////////////////////////////////////////////////

const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: "RiderSession", required: true },
    riderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    status: {
      type: String,
      enum: ["in_progress", "booked", "completed", "expired", "cancelled", "abandoned"],
      default: "in_progress",
    },

    ordersCompleted: { type: Number, default: 0 },
    orderIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }],

    // Join ke waqt session se snapshot (baad mein admin badle to rider par asar nahi)
    bonusAmount: { type: Number, required: true },
    requiredOrders: { type: Number, required: true },
    timeLimitHours: { type: Number },
    extendHours: { type: Number },
    isExtend12: { type: Boolean, default: false },
    isExtend16: { type: Boolean, default: false },
    bonusPaid: { type: Boolean, default: false },

    // true = ye rider is session par apna "attempt" use kar chuka hai (cancel hone par false)
    attemptLocked: { type: Boolean, default: true },

    joinedAt: { type: Date, default: Date.now },
    startedAt: { type: Date, default: null },   // booked ke liye activation par set hota hai
    expiresAt: { type: Date, default: null },   // timer ka single source of truth
    completedAt: { type: Date, default: null },
    abandonedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    abandonReason: { type: String, default: "" },
  },
  { timestamps: true },
);

// ✅ FIXED: Added unique names to prevent Mongoose duplicate index warnings
schema.index(
  { riderId: 1 }, 
  { unique: true, partialFilterExpression: { status: "in_progress" }, name: "idx_unique_active_rider" }
);

schema.index(
  { riderId: 1 }, 
  { unique: true, partialFilterExpression: { status: "booked" }, name: "idx_unique_booked_rider" }
);

schema.index(
  { sessionId: 1, riderId: 1 }, 
  { unique: true, partialFilterExpression: { attemptLocked: true }, name: "idx_unique_attempt_locked" }
);

schema.index({ status: 1, expiresAt: 1 }, { name: "idx_status_expires" });

module.exports = mongoose.model("RiderSessionParticipation", schema);

