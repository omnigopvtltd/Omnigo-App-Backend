// const mongoose = require("mongoose");

// const CallLogSchema = new mongoose.Schema(
//   {
//     conversationId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Conversation",
//       required: true,
//     },
//     caller: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       required: true,
//     },
//     receiver: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       required: true,
//     },
//     callType: {
//       type: String,
//       enum: ["audio", "video"],
//       default: "audio",
//     },
//     status: {
//       type: String,
//       enum: ["missed", "rejected", "connected", "ended"],
//       default: "missed",
//     },
//     startedAt: {
//       type: Date,
//       default: Date.now,
//     },
//     endedAt: {
//       type: Date,
//     },
//     durationInSeconds: {
//       type: Number,
//       default: 0,
//     },
//   },
//   { timestamps: true }
// );

// module.exports = mongoose.model("CallLog", CallLogSchema);

// const mongoose = require("mongoose");

// const callLogSchema = new mongoose.Schema(
//   {
//     conversationId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Conversation",
//       default: null,
//     },

//     callerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
//     callerRole: { type: String, enum: ["customer", "rider", "admin"], required: true },
//     receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
//     receiverRole: { type: String, enum: ["customer", "rider", "admin"], required: true },

//     type: { type: String, enum: ["voice"], default: "voice" }, // room for "video" later

//     status: {
//       type: String,
//       enum: ["ringing", "ongoing", "completed", "missed", "rejected"],
//       default: "ringing",
//     },

//     startedAt: { type: Date, default: Date.now },
//     connectedAt: { type: Date, default: null },
//     endedAt: { type: Date, default: null },
//     durationSeconds: { type: Number, default: 0 },
//   },
//   { timestamps: true }
// );

// callLogSchema.index({ callerId: 1, createdAt: -1 });
// callLogSchema.index({ receiverId: 1, createdAt: -1 });

// module.exports = mongoose.model("CallLog", callLogSchema);