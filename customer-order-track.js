const { io } = require("socket.io-client");
const socket = io("http://localhost:5000"); 

//  Order id
const TEST_ORDER_ID = "6a37be024b456386538bf7b5"; 

socket.on("connect", () => {
  console.log(`[Customer] Connected to Socket Server. Socket ID: ${socket.id}`);

  // 1. Automatically tracking room join 
  socket.emit("joinOrderTracking", TEST_ORDER_ID);
  console.log(`[Customer] Sent request to join tracking room for order_${TEST_ORDER_ID}`);
});

// 2. Set up Listeners That updates without clicking a button
socket.on("orderStatusUpdated", (data) => {
  console.log("[REAL-TIME ALERT] Global Order Status Changed:", data);
});

socket.on("riderAssignedLive", (data) => {
  console.log("[REAL-TIME ALERT] Rider Has Accepted Your Order! Details:", data);
});

socket.on("riderLocationLive", (data) => {
  console.log(`[MAP UDPATE] Rider is moving! Lat: ${data.latitude}, Lng: ${data.longitude} (Time: ${new Date(data.timestamp).toLocaleTimeString()})`);
});

socket.on("orderTrackingStatusLive", (data) => {
  console.log("[REAL-TIME ALERT] Timeline Update:", data);
});

socket.on("disconnect", () => {
  console.log("[Customer] Disconnected from server");
});