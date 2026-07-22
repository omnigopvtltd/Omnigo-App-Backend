// // socket.js
// let io;

// const initSocket = (server) => {
//   const { Server } = require("socket.io");

//   io = new Server(server, {
//     cors: {
//       origin: "*",
//       methods: ["GET", "POST", "PUT", "DELETE"],
//     },
//   });

//   // Global Connection Monitor (Optional but good for absolute main tracking)
//   io.on("connection", (socket) => {
//     console.log(`[Socket.io] New Raw Connection: ${socket.id}`);
//     console.log("Total Engine Clients:", io.engine.clientsCount);

//     // NEW — admin dashboard joins this room to receive live rider positions
//     socket.on("joinAdminTracking", () => {
//       socket.join("admin_tracking");
//     });

//     socket.on("disconnect", () => {
//       console.log(`[Socket.io] Raw Disconnected: ${socket.id}`);
//       console.log("Total Engine Clients Remaining:", io.engine.clientsCount);
//     });
//   });

//   // Chat Socket Sub-module initializes here
//   const chatSocket = require("./chatSocket");
//   chatSocket(io);

//   return io;
// };

// const getIO = () => {
//   if (!io) {
//     throw new Error("Socket not initialized");
//   }
//   return io;
// };

// module.exports = {
//   initSocket,
//   getIO,
// };

// socket.js
let io;

const initSocket = (server) => {
  const { Server } = require("socket.io");

  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST", "PATCH", "DELETE"],
    },
    pingInterval: 10000,
    pingTimeout: 5000,
  });

  io.on("connection", (socket) => {
    console.log(`[Socket.io] Connected: ${socket.id}`);

    // Join Admin Live Tracking Dashboard
    socket.on("joinAdminTracking", () => {
      socket.join("admin_tracking");
    });

    // Join Specific Order Tracking (Used by Customer Frontend)
    socket.on("trackOrder", (orderId) => {
      if (orderId) {
        socket.join(`order_${orderId}`);
      }
    });

    // Rider stream endpoint (Every second high-frequency socket update)
    socket.on("riderLocationStream", async (data) => {
      const { riderId, orderId, lat, lng, speed, heading, battery } = data;

      const payload = {
        riderId,
        orderId,
        location: { lat, lng, updatedAt: new Date() },
        telemetry: { speed: speed || 0, heading: heading || 0, battery: battery || null },
      };

      // 1. Broadcast immediately to Admin Map
      io.to("admin_tracking").emit("riderLocationUpdated", payload);

      // 2. Broadcast immediately to the Specific Customer watching this order
      if (orderId) {
        io.to(`order_${orderId}`).emit("liveRiderLocation", payload);
      }
    });

    socket.on("disconnect", () => {
      console.log(`[Socket.io] Disconnected: ${socket.id}`);
    });
  });

  // Load chat socket module
  const chatSocket = require("./chatSocket");
  chatSocket(io);
  
   // Chat Socket Sub-module initializes here
  const OrderTrackSocket = require("./order-track-socket");
  OrderTrackSocket(io);

  return io;
};

const getIO = () => {
  if (!io) throw new Error("Socket.io not initialized!");
  return io;
};

module.exports = { initSocket, getIO };