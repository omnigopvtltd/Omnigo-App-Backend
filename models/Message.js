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
      ref: "User",
      required: true,
    },
    senderRole: {
      type: String,
      enum: ["customer", "rider", "admin", "ai"],
      required: true,
    },

    text: { type: String, default: "" },
    attachments: [{ type: String }], // image/file URLs
    // message: [
    //   {
    //     message: {
    //       type: String,
    //       required: true,
    //     },
    //     timestamp: {
    //       type: Date,
    //       default: Date.now,
    //     },
    //     isRead: {
    //       type: Boolean,
    //       default: false,
    //     },
    //   },
    // ],

    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    // Soft-deleted messages stay in the DB for moderation/audit but are
    // hidden from the thread.
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

messageSchema.index({ conversationId: 1, createdAt: 1 });

module.exports = mongoose.model("Message", messageSchema);
