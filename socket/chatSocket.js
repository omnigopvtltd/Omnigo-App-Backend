const admin = require("firebase-admin");
require("../config/firebase");
// const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getMessaging } = require("firebase-admin/messaging");
const path = require("path");
const Message = require("../models/Message");
const Conversation = require("../models/Conversation");
const CallLog = require("../models/callLog");
const User = require("../models/User");
const onlineUsers  = require("../socket");
// const serviceAccountPath = path.join(__dirname, "serviceAccountKey.json");

async function handleOfflineNotification(
  receiverId,
  messageText,
  senderId,
  messageType,
) {
  try {
    // 1. Find token of Receiver
    const user = await User.findById(receiverId);
    const fcmToken =
      "cb3sjZ5J9QIxGNWRk4lMFE:APA91bGHjkGgfP3D4Y8IvP6KeGwI636astufuR44zxZ0JMXkEPb6bo_gdxfn_Nbq6UVgaw0jEfS92_SXwm97DxYw9LZLqstqTliNLgys0gw2mgEqvV-e0E4"; // Hardcoded for testing purposes

    if (!fcmToken) {
      console.log(
        `[FCM Notification Skip]: No token found for User ID: ${receiverId}`,
      );
      return;
    }

    // 2. Construct Notification Data Payload
    const payload = {
      token: fcmToken,
      notification: {
        title: "New Message Received",
        body: messageType === "text" ? messageText : "Sent an attachment",
      },
      data: {
        click_action: "FLUTTER_NOTIFICATION_CLICK",
        type: "chat",
        senderId: String(senderId),
      },
    };

    // 3. Send out message using Firebase Messaging engine
    const response = await getMessaging().send(payload);
    console.log("Firebase Push Notification sent successfully:", response);
  } catch (error) {
    console.error("Firebase Messaging System Error:", error.message);
  }
}

// const onlineUsers = new Map();
const activeCallSessions = new Map();

const chatSocket = (io, onlineUsers) => {
  io.on("connection", (socket) => {
    console.log(`>>> Chat Connected Subsystem: ${socket.id}`);

    socket.on("join", (userId) => {
      socket.join(userId);
      onlineUsers.set(userId, socket.id);
      socket.userId = userId;
      io.emit("onlineUsers", [...onlineUsers.keys()]);
    });

    socket.on("joinConversation", (conversationId) => {
      socket.join(conversationId);
    });

    // ================= SAFE SEND MESSAGE PIPELINE =================
    socket.on("sendMessage", async (data) => {
      const {
        conversationId,
        sender,
        receiver,
        message,
        messageType = "text",
      } = data;
      try {
        const newMessage = await Message.create({
          conversationId,
          sender,
          receiver,
          message,
          messageType,
        });

        await Conversation.findByIdAndUpdate(conversationId, {
          lastMessage: message,
          lastMessageAt: new Date(),
        });

        // 2. Check if Receiver is active in the chat room?
        const roomClients = io.sockets.adapter.rooms.get(data.conversationId);

        // Dynamic Room Checking System logic adjustment
        let isReceiverInRoom = false;
        if (roomClients && onlineUsers) {
          // Check if receiver's socket ID is linked and present in room array
          const targetSocketId = onlineUsers.get(data.receiver);
          if (targetSocketId && roomClients.has(targetSocketId)) {
            isReceiverInRoom = true;
          }
        }

        if (isReceiverInRoom) {
          // if active so send message through socket
          io.to(data.conversationId).emit("receiveMessage", newMessage);
        } else {
          // if not active so send message through socket + background push notification
          io.to(data.conversationId).emit("receiveMessage", newMessage);

          // Trigger Firebase push notification flawlessly now
          await handleOfflineNotification(
            data.receiver,
            data.message,
            data.sender,
            data.messageType,
          );
        }

        io.to(sender).emit("messageSent", newMessage);
      } catch (err) {
        console.error("⚠️ DATABASE ERROR CATCH:", err.message);
        socket.emit("messageError", {
          status: "FAILED",
          reason: "Database Sync Error. Record skipped.",
        });
      }
    });

    // ================= MONGO INTEGRATED CALL SIGNALING =================
    socket.on("initiateCall", async (data) => {
      const {
        conversationId,
        callerId,
        receiverId,
        signalData,
        callType = "audio",
      } = data;

      try {
        const newCallRecord = await CallLog.create({
          conversationId,
          caller: callerId,
          receiver: receiverId,
          callType,
          status: "missed",
        });

        activeCallSessions.set(conversationId, {
          dbRecordId: newCallRecord._id,
          startedTime: new Date(),
        });

        io.to(receiverId).emit("incomingCall", {
          conversationId,
          callerId,
          signalData,
          callType,
          callLogId: newCallRecord._id,
        });
      } catch (error) {
        console.error(
          "Failed to write initial call tracking state:",
          error.message,
        );
      }
    });

    socket.on("answerCall", async (data) => {
      const { conversationId, receiverId, callerId, signalData } = data;

      try {
        const session = activeCallSessions.get(conversationId);
        if (session) {
          await CallLog.findByIdAndUpdate(session.dbRecordId, {
            status: "connected",
            startedAt: new Date(),
          });
        }

        io.to(callerId).emit("callAccepted", { receiverId, signalData });
      } catch (error) {
        console.error("Answer state sync crash:", error.message);
      }
    });

    socket.on("endCall", async (data) => {
      const { conversationId, targetId, reason } = data;

      try {
        const session = activeCallSessions.get(conversationId);
        if (session) {
          const endTime = new Date();
          const record = await CallLog.findById(session.dbRecordId);

          let finalStatus = "ended";
          let totalDuration = 0;

          if (reason === "rejected") {
            finalStatus = "rejected";
          } else if (record && record.status === "connected") {
            totalDuration = Math.round(
              (endTime - new Date(session.startedTime)) / 1000,
            );
            finalStatus = "ended";
          }

          await CallLog.findByIdAndUpdate(session.dbRecordId, {
            status: finalStatus,
            endedAt: endTime,
            durationInSeconds: totalDuration,
          });

          activeCallSessions.delete(conversationId);
        }

        io.to(targetId).emit("callEnded", { reason });
      } catch (error) {
        console.error("Failed terminating db state engine:", error.message);
      }
    });

    socket.on("disconnect", () => {
      if (socket.userId) onlineUsers.delete(socket.userId);
    });
  });
};

module.exports = chatSocket;
