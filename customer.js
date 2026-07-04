const io = require("socket.io-client");
const socket = io("http://localhost:5000");

const CUSTOMER_ID = "6a22b6644a4b879e3c210f02";
const CONVERSATION_ID = "6a463bd674f1e5793327c41f";
const RIDER_ID = "6a35a742e8c8ea4bae1926a4";

socket.on("connect", () => {
  console.log("Customer Connected to Socket Server:", socket.id);

  // 1. Identity and Room Setup
  socket.emit("join", CUSTOMER_ID);
  socket.emit("joinConversation", CONVERSATION_ID);

  // 2. Chat Simulation Trigger: Initial message sends after 1 second
  setTimeout(() => {
    sendCustomerMessage("Hello Rider, where are you?");

    // Trigger typing state tracking
    socket.emit("typing", {
      conversationId: CONVERSATION_ID,
      sender: CUSTOMER_ID,
    });
  }, 1000);
});

// Helper function to bundle messages easily
function sendCustomerMessage(text) {
  console.log(`💬 Customer Sending: "${text}"`);
  socket.emit("sendMessage", {
    conversationId: CONVERSATION_ID,
    sender: CUSTOMER_ID,
    receiver: RIDER_ID,
    message: text,
  });
}

// ================= REAL-TIME TEXT TWO-WAY CHAT LISTENER =================
socket.on("receiveMessage", (data) => {
  console.log(`\n📩 Received from Rider: "${data.message}"`);

  // Two-way automated conversation chain setup
  setTimeout(() => {
    if (data.message.includes("coming") || data.message.includes("way")) {
      sendCustomerMessage("Great, thank you! I am waiting outside.");
    } else {
      sendCustomerMessage("Okay, copy that.");
    }
  }, 3500); // Response loop delay
});

// ================= CALL SYSTEM ARCHITECTURE =================

function startAudioCall() {
  console.log("Initiating call to Rider...");
  socket.emit("initiateCall", {
    conversationId: CONVERSATION_ID,
    callerId: CUSTOMER_ID,
    receiverId: RIDER_ID,
    signalData: { sdp: "dummy-webrtc-offer-packet-data", type: "offer" },
    callType: "audio",
  });
}

// Make a dynamic test call 4 seconds after script loads (Rider turns online first)
console.log("Waiting 4 seconds before making a test call workflow...");
setTimeout(() => {
  console.log("📞 Triggering: Sending initiateCall signal to Rider...");
  startAudioCall();
}, 4000);

socket.on("callAccepted", (data) => {
  console.log("\n🎉 CALL CONNECTED SUCCESSFULLY!");
  console.log("Rider accepted the call! Remote WebRTC Signal:", data.signalData);
});

socket.on("callEnded", (data) => {
  console.log("Call was terminated by remote peer. Reason:", data.reason);
});

// ================= APP METADATA & ERROR TRACKERS =================
socket.on("onlineUsers", (users) => {
  console.log("Online Users List:", users);
});

socket.on("messageSent", (data) => {
  console.log("Server confirmed message sent successfully:", data.message);
});

socket.on("messageError", (errorLog) => {
  console.error("ALERT: Server couldn't save the message!", errorLog);
});

socket.onAny((event, data) => {
  console.log(`[EVENT RECEIVED]: ${event}`, data);
});