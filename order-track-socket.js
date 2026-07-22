
const Order = require("./models/Order"); 

const orderTrackSocket = (io) => {
  io.on("connection", (socket) => {
    
    // ================= CLIENT/USER JOINS ORDER TRACKING ROOM =================
    socket.on("joinOrderTracking", (orderId) => {
      socket.join(`order_${orderId}`);
      console.log(`📡 User/Manager joined tracking room: order_${orderId}`);
    });

    // ================= RIDER LIVE LOCATION UPDATES =================
    socket.on("updateRiderLocation", async (data) => {
      const { orderId, riderId, latitude, longitude } = data;

      try {
        // Option 1: Agar database mein live location maintain karni hai (Optional)
        // await Order.findByIdAndUpdate(orderId, { "riderLocation": { latitude, longitude } });

        // Option 2: Room mein majood Customer/Manager ko instant real-time data push karein
        io.to(`order_${orderId}`).emit("riderLocationLive", {
          orderId,
          riderId,
          latitude,
          longitude,
          timestamp: new Date()
        });

        console.log(`📍 Live Coordinates from Rider ${riderId} for Order ${orderId}: [Lat: ${latitude}, Lng: ${longitude}]`);
      } catch (error) {
        console.error("⚠️ Location tracking pipeline error:", error.message);
      }
    });

    // Room se leave karne ka listener (jab tracking band karni ho)
    socket.on("leaveOrderTracking", (orderId) => {
      socket.leave(`order_${orderId}`);
      console.log(`❌ User left tracking room: order_${orderId}`);
    });
  });
};

module.exports = orderTrackSocket;