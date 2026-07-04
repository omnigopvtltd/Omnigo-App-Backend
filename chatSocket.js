
// chat-socket.js
const Message = require("./models/Message");
const Conversation = require("./models/Conversation");
const CallLog = require("./models/CallLog"); // New Model Include

const onlineUsers = new Map();
// Live active call structural monitoring pointer
const activeCallSessions = new Map();

const chatSocket = (io) => {
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
      const { conversationId, sender, receiver, message, messageType = "text" } = data;
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

        io.to(receiver).emit("receiveMessage", newMessage);
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

    // 1. Initiate Call & Create "Missed" Entry in DB Initially
    socket.on("initiateCall", async (data) => {
      const { conversationId, callerId, receiverId, signalData, callType = "audio" } = data;
      
      try {
        // Initial state log structure create in DB (Default status is 'missed')
        const newCallRecord = await CallLog.create({
          conversationId,
          caller: callerId,
          receiver: receiverId,
          callType,
          status: "missed"
        });

        // Memory pointer track create for end session state  
        activeCallSessions.set(conversationId, {
          dbRecordId: newCallRecord._id,
          startedTime: new Date()
        });

        io.to(receiverId).emit("incomingCall", {
          conversationId,
          callerId,
          signalData,
          callType,
          callLogId: newCallRecord._id // Flutter payload confirmation logic tracker
        });
      } catch (error) {
        console.error("Failed to write initial call tracking state:", error.message);
      }
    });

    // 2. Target Answers Call -> Update DB Status to "connected"
    socket.on("answerCall", async (data) => {
      const { conversationId, receiverId, callerId, signalData } = data;
      
      try {
        const session = activeCallSessions.get(conversationId);
        if (session) {
          await CallLog.findByIdAndUpdate(session.dbRecordId, { 
            status: "connected",
            startedAt: new Date() // Reset to exact stream connection moment
          });
        }
        
        io.to(callerId).emit("callAccepted", { receiverId, signalData });
      } catch (error) {
        console.error("Answer state sync crash:", error.message);
      }
    });

    // 3. Reject or Hang Up Call -> Calculate Duration & Save to DB
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
            // Seconds runtime diff algorithm 
            totalDuration = Math.round((endTime - new Date(session.startedTime)) / 1000);
            finalStatus = "ended";
          }

          await CallLog.findByIdAndUpdate(session.dbRecordId, {
            status: finalStatus,
            endedAt: endTime,
            durationInSeconds: totalDuration
          });

          // Memory clear out
          activeCallSessions.delete(conversationId);
        }

        io.to(targetId).emit("callEnded", { reason });
      } catch (error) {
        console.error("Failed terminating db state engine:", error.message);
      }
    });

    // Handle sudden disconnect clean up configurations
    socket.on("disconnect", () => {
      if (socket.userId) onlineUsers.delete(socket.userId);
    });
  });
};

module.exports = chatSocket;