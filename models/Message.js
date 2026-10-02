// const mongoose = require("mongoose");

// const messageSchema = new mongoose.Schema(
//   {
//     conversationId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Conversation",
//       required: true,
//     },

//     sender: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       required: true,
//     },

//     receiver: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       required: true,
//     },

//     message: [
//       {
//         message: {
//           type: String,
//           required: true,
//         },
//         timestamp: {
//           type: Date,
//           default: Date.now,
//         },
//         isRead: {
//           type: Boolean,
//           default: false,
//         },
//       },
//     ],
//   },
//   {
//     timestamps: true,
//   },
// );

// module.exports = mongoose.model("Message", messageSchema);

const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "senderModel", // Dynamic collection lookup
    },
    senderRole: {
      type: String,
      enum: ["user", "rider", "vendor", "admin", "ai"],
      required: true,
    },
    senderModel: {
      type: String,
      required: true,
      enum: ["User", "Rider", "Vendor", "Admin"],
      default: "User",
    },

    text: { type: String, default: "" },
    attachments: [{ type: String }],
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "senderModel" }],
    isRead: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

messageSchema.index({ conversationId: 1, createdAt: 1 });

module.exports = mongoose.model("Message", messageSchema);