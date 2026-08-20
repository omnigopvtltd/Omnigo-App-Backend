module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log("Tracker Socket Connected:", socket.id);

    // Join room for specific order updates
    socket.on("joinOrderRoom", ({ orderId }) => {
      socket.join(`order_${orderId}`);
    });

    // Flutter Rider App emits GPS every 3–5 seconds
    socket.on("updateRiderLocation", async (data) => {
      const { riderId, orderId, latitude, longitude, heading } = data;

      try {
        // 1. Update Rider's GeoJSON Location in MongoDB
        const User = require("../models/User");
        await User.findByIdAndUpdate(riderId, {
          "riderProfile.location": {
            type: "Point",
            coordinates: [longitude, latitude],
            heading: heading || 0,
            updatedAt: new Date(),
          },
        });

        // 2. Broadcast Live GPS to Customer App & React Admin Panel
        io.to(`order_${orderId}`).emit("riderLocationLive", {
          riderId,
          orderId,
          location: {
            latitude,
            longitude,
            heading,
          },
        });
      } catch (err) {
        console.error("Socket GPS Error:", err.message);
      }
    });

    socket.on("disconnect", () => {
      console.log("Tracker Socket Disconnected:", socket.id);
    });
  });
};