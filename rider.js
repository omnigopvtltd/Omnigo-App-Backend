const io = require("socket.io-client");
const socket = io("http://localhost:5000");

const RIDER_ID = "6a35a742e8c8ea4bae1926a4";
const CONVERSATION_ID = "6a463bd674f1e5793327c41f";
const CUSTOMER_ID = "6a22b6644a4b879e3c210f02";

socket.on("connect", () => {
  console.log("Rider Connected to Socket Server:", socket.id);

  // 1. Register identity channels
  socket.emit("join", RIDER_ID);
  socket.emit("joinConversation", CONVERSATION_ID);
});

// Helper function to send replies easily
function sendRiderMessage(text) {
  console.log(`💬 Rider Replying: "${text}"`);
  socket.emit("sendMessage", {
    conversationId: CONVERSATION_ID,
    sender: RIDER_ID,
    receiver: CUSTOMER_ID,
    message: text,
  });
}

// ================= REAL-TIME TEXT TWO-WAY CHAT LISTENER =================
socket.on("receiveMessage", (data) => {
  console.log("\n--- NEW MESSAGE RECEIVED ---");
  console.log(`From: ${data.sender}`);
  console.log(`Message: ${data.message}`);
  console.log("----------------------------\n");

  // Dynamic automatic response back to customer's text prompts
  setTimeout(() => {
    if (data.message.includes("where") || data.message.includes("location")) {
      sendRiderMessage("Yes, I am on my way! Reaching in 5 minutes.");
    } else {
      sendRiderMessage("Got it, see you soon!");
    }
  }, 3500);
});

// ================= CALL SYSTEM ARCHITECTURE =================
socket.on("incomingCall", (data) => {
  console.log(`\n📞 INCOMING CALL FROM: ${data.callerId}`);
  console.log(`Call Type: ${data.callType}`);
  
  // Auto accept the call handshake protocol after 2.5 seconds
  setTimeout(() => {
    console.log("Accepting incoming call dynamic handshake...");
    socket.emit("answerCall", {
      conversationId: data.conversationId,
      receiverId: RIDER_ID,
      callerId: data.callerId,
      signalData: { sdp: "dummy-webrtc-answer-packet-data", type: "answer" }
    });
  }, 2500);
});

socket.on("callEnded", (data) => {
  console.log("Caller hung up / Call ended.");
});

// ================= METADATA LOGS TRACKERS =================
socket.on("typing", (data) => {
  console.log(`User ${data.sender} is typing...`);
});

socket.on("onlineUsers", (users) => {
  console.log("Updated Online Users:", users);
});

socket.onAny((event, data) => {
  console.log(`[EVENT RECEIVED]: ${event}`, data);
});