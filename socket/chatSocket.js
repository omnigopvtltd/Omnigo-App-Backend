const { getMessaging } = require("firebase-admin/messaging");
const Message = require("../models/Message");
const Conversation = require("../models/Conversation");
const CallLog = require("../models/callLog");
const User = require("../models/User");

// Dynamic FCM Push Notification Helper
async function handleOfflineNotification(
  receiverId,
  messageText,
  senderId,
  attachments = []
) {
  try {
    const user = await User.findById(receiverId).select("fcmToken fcmTokens");
    if (!user) return;

    // Collect all valid FCM tokens for multi-device support
    const tokens = [];
    if (user.fcmToken) tokens.push(user.fcmToken);
    if (Array.isArray(user.fcmTokens)) {
      user.fcmTokens.forEach((t) => {
        if (t && !tokens.includes(t)) tokens.push(t);
      });
    }

    if (tokens.length === 0) {
      console.log(`[FCM Skip]: No active tokens found for User ID: ${receiverId}`);
      return;
    }

    const bodyText = messageText || (attachments.length > 0 ? "Sent an attachment" : "New message");

    const payload = {
      notification: {
        title: "New Message Received",
        body: bodyText,
      },
      data: {
        click_action: "FLUTTER_NOTIFICATION_CLICK",
        type: "chat",
        senderId: String(senderId),
      },
    };

    if (tokens.length === 1) {
      await getMessaging().send({ ...payload, token: tokens[0] });
    } else {
      await getMessaging().sendMulticast({ ...payload, tokens });
    }
    console.log(`FCM Push Notification sent successfully to User ID: ${receiverId}`);
  } catch (error) {
    console.error("Firebase Messaging System Error:", error.message);
  }
}

const activeCallSessions = new Map();

const chatSocket = (io, onlineUsers) => {
  io.on("connection", (socket) => {
    console.log(`>>> Chat Connected Subsystem: ${socket.id}`);

    socket.on("join", (userId) => {
      if (!userId) return;
      socket.join(userId.toString());
      onlineUsers.set(userId.toString(), socket.id);
      socket.userId = userId.toString();
      io.emit("onlineUsers", [...onlineUsers.keys()]);
    });

    socket.on("joinConversation", (conversationId) => {
      if (conversationId) {
        socket.join(conversationId.toString());
      }
    });

    // ================= SAFE SEND MESSAGE PIPELINE =================
    socket.on("sendMessage", async (data) => {
      const {
        conversationId,
        senderId,
        senderRole,
        receiverId,
        text = "",
        attachments = [],
      } = data;

      try {
        if (!conversationId || !senderId || !senderRole || !receiverId) {
          return socket.emit("messageError", {
            status: "FAILED",
            reason: "Missing required payload parameters (conversationId, senderId, senderRole, receiverId)",
          });
        }

        // 1. Create message document
        const newMessage = await Message.create({
          conversationId,
          senderId,
          senderRole,
          text,
          attachments,
        });

        // 2. Identify target unread counter role based on receiver role
        // Supported roles: user, rider, vendor, admin
        let targetRoleKey = "user";
        if (["rider", "vendor", "admin"].includes(data.receiverRole)) {
          targetRoleKey = data.receiverRole;
        }

        // 3. Update Conversation lastMessage object and increment unread count
        await Conversation.findByIdAndUpdate(conversationId, {
          lastMessage: {
            text,
            senderId,
            senderRole,
            sentAt: newMessage.createdAt,
          },
          $inc: { [`unreadCount.${targetRoleKey}`]: 1 },
        });

        // 4. Room Active Receiver Verification
        const roomClients = io.sockets.adapter.rooms.get(conversationId.toString());
        let isReceiverInRoom = false;

        if (roomClients && onlineUsers) {
          const targetSocketId = onlineUsers.get(receiverId.toString());
          if (targetSocketId && roomClients.has(targetSocketId)) {
            isReceiverInRoom = true;
          }
        }

        // 5. Emit message events
        io.to(conversationId.toString()).emit("receiveMessage", newMessage);
        socket.emit("messageSent", newMessage);

        // 6. Push notification if receiver is not actively inside the room
        if (!isReceiverInRoom) {
          await handleOfflineNotification(receiverId, text, senderId, attachments);
        }
      } catch (err) {
        console.error("⚠️ SOCKET SEND MESSAGE ERROR:", err.message);
        socket.emit("messageError", {
          status: "FAILED",
          reason: err.message || "Database execution failed.",
        });
      }
    });

    // ================= CALL SIGNALING =================
    socket.on("initiateCall", async (data) => {
      const { conversationId, callerId, receiverId, signalData, callType = "audio" } = data;
      try {
        const newCallRecord = await CallLog.create({
          conversationId,
          caller: callerId,
          receiver: receiverId,
          callType,
          status: "missed",
        });

        activeCallSessions.set(conversationId.toString(), {
          dbRecordId: newCallRecord._id,
          startedTime: new Date(),
        });

        io.to(receiverId.toString()).emit("incomingCall", {
          conversationId,
          callerId,
          signalData,
          callType,
          callLogId: newCallRecord._id,
        });
      } catch (error) {
        console.error("Failed to write initial call state:", error.message);
      }
    });

    socket.on("answerCall", async (data) => {
      const { conversationId, receiverId, callerId, signalData } = data;
      try {
        const session = activeCallSessions.get(conversationId.toString());
        if (session) {
          await CallLog.findByIdAndUpdate(session.dbRecordId, {
            status: "connected",
            startedAt: new Date(),
          });
        }
        io.to(callerId.toString()).emit("callAccepted", { receiverId, signalData });
      } catch (error) {
        console.error("Answer state sync crash:", error.message);
      }
    });

    socket.on("endCall", async (data) => {
      const { conversationId, targetId, reason } = data;
      try {
        const session = activeCallSessions.get(conversationId.toString());
        if (session) {
          const endTime = new Date();
          const record = await CallLog.findById(session.dbRecordId);

          let finalStatus = "ended";
          let totalDuration = 0;

          if (reason === "rejected") {
            finalStatus = "rejected";
          } else if (record && record.status === "connected") {
            totalDuration = Math.round((endTime - new Date(session.startedTime)) / 1000);
            finalStatus = "ended";
          }

          await CallLog.findByIdAndUpdate(session.dbRecordId, {
            status: finalStatus,
            endedAt: endTime,
            durationInSeconds: totalDuration,
          });

          activeCallSessions.delete(conversationId.toString());
        }

        io.to(targetId.toString()).emit("callEnded", { reason });
      } catch (error) {
        console.error("Failed terminating call state:", error.message);
      }
    });

    socket.on("disconnect", () => {
      if (socket.userId) {
        onlineUsers.delete(socket.userId);
        io.emit("onlineUsers", [...onlineUsers.keys()]);
      }
    });
  });
};

module.exports = chatSocket;