// // // socket.js
// // let io;

// // const initSocket = (server) => {
// //   const { Server } = require("socket.io");

// //   io = new Server(server, {
// //     cors: {
// //       origin: "*",
// //       methods: ["GET", "POST", "PUT", "DELETE"],
// //     },
// //   });

// //   // Global Connection Monitor (Optional but good for absolute main tracking)
// //   io.on("connection", (socket) => {
// //     console.log(`[Socket.io] New Raw Connection: ${socket.id}`);
// //     console.log("Total Engine Clients:", io.engine.clientsCount);

// //     // NEW — admin dashboard joins this room to receive live rider positions
// //     socket.on("joinAdminTracking", () => {
// //       socket.join("admin_tracking");
// //     });

// //     socket.on("disconnect", () => {
// //       console.log(`[Socket.io] Raw Disconnected: ${socket.id}`);
// //       console.log("Total Engine Clients Remaining:", io.engine.clientsCount);
// //     });
// //   });

// //   // Chat Socket Sub-module initializes here
// //   const chatSocket = require("./chatSocket");
// //   chatSocket(io);

// //   return io;
// // };

// // const getIO = () => {
// //   if (!io) {
// //     throw new Error("Socket not initialized");
// //   }
// //   return io;
// // };

// // module.exports = {
// //   initSocket,
// //   getIO,
// // };

// // socket.js
// // socket.js
// const User = require("./models/User"); // Adjust path if needed

// let io;

// const initSocket = (server) => {
//   const { Server } = require("socket.io");

//   io = new Server(server, {
//     cors: {
//       origin: "*",
//       methods: ["GET", "POST", "PATCH", "DELETE"],
//     },
//     pingInterval: 10000,
//     pingTimeout: 5000,
//   });

//   io.on("connection", async (socket) => {
//     // Extract userId from auth payload or connection query string
//     const userId =
//       socket.handshake.auth?.userId || socket.handshake.query?.userId;

//     console.log(`[Socket.io] Connected: ${socket.id} (User ID: ${userId || "Guest"})`);
//     console.log("Total Engine Clients:", io.engine.clientsCount);

//     if (userId) {
//       // 1. Join user to their own private room for direct events / calls
//       socket.join(`user_${userId}`);

//       // 2. Mark User as Online in DB
//       try {
//         await User.findByIdAndUpdate(userId, {
//           isOnline: true,
//           lastSeen: new Date(),
//         });

//         // Broadcast to clients/admin that this user came online
//         io.emit("userStatusChanged", { userId, isOnline: true });
//       } catch (err) {
//         console.error("Failed to update user online status on connect:", err);
//       }
//     }

//     // Join Admin Live Tracking Dashboard
//     socket.on("joinAdminTracking", () => {
//       socket.join("admin_tracking");
//     });

//     // Join Specific Order Tracking (Used by Customer Frontend)
//     socket.on("trackOrder", (orderId) => {
//       if (orderId) {
//         socket.join(`order_${orderId}`);
//       }
//     });

//     // Rider stream endpoint
//     socket.on("riderLocationStream", async (data) => {
//       const { riderId, orderId, lat, lng, speed, heading, battery } = data;

//       const payload = {
//         riderId,
//         orderId,
//         location: { lat, lng, updatedAt: new Date() },
//         telemetry: {
//           speed: speed || 0,
//           heading: heading || 0,
//           battery: battery || null,
//         },
//       };

//       io.to("admin_tracking").emit("riderLocationUpdated", payload);

//       if (orderId) {
//         io.to(`order_${orderId}`).emit("liveRiderLocation", payload);
//       }
//     });

//     // =====================================
//     // CHAT
//     // =====================================
//     socket.on("chat:joinConversation", (conversationId) => {
//       socket.join(`conversation_${conversationId}`);
//     });

//     socket.on("chat:leaveConversation", (conversationId) => {
//       socket.leave(`conversation_${conversationId}`);
//     });

//     socket.on("chat:typing", ({ conversationId, userId, role }) => {
//       socket
//         .to(`conversation_${conversationId}`)
//         .emit("chat:typing", { userId, role });
//     });

//     socket.on("chat:stopTyping", ({ conversationId, userId }) => {
//       socket
//         .to(`conversation_${conversationId}`)
//         .emit("chat:stopTyping", { userId });
//     });

//     // =====================================
//     // CALLS (WebRTC)
//     // =====================================
//     socket.on("call:offer", ({ callId, toUserId, sdp }) => {
//       io.to(`user_${toUserId}`).emit("call:offer", {
//         callId,
//         sdp,
//         fromSocketId: socket.id,
//       });
//     });

//     socket.on("call:answer", ({ callId, toUserId, sdp }) => {
//       io.to(`user_${toUserId}`).emit("call:answer", { callId, sdp });
//     });

//     socket.on("call:ice-candidate", ({ callId, toUserId, candidate }) => {
//       io.to(`user_${toUserId}`).emit("call:ice-candidate", {
//         callId,
//         candidate,
//       });
//     });

//     socket.on("call:reject", ({ callId, toUserId }) => {
//       io.to(`user_${toUserId}`).emit("call:rejected", { callId });
//     });

//     socket.on("call:hangup", ({ callId, toUserId }) => {
//       io.to(`user_${toUserId}`).emit("call:hangup", { callId });
//     });

//     // =====================================
//     // DISCONNECT & OFFLINE HANDLER
//     // =====================================
//     socket.on("disconnect", async () => {
//       console.log(`[Socket.io] Disconnected: ${socket.id}`);

//       if (userId) {
//         // Check if user has other tabs/devices active in their room
//         const activeSockets = await io.in(`user_${userId}`).fetchSockets();

//         // If no active connections remain for this user, set isOnline to false
//         if (activeSockets.length === 0) {
//           try {
//             await User.findByIdAndUpdate(userId, {
//               isOnline: false,
//               lastSeen: new Date(),
//             });

//             // Broadcast user went offline
//             io.emit("userStatusChanged", { userId, isOnline: false });
//           } catch (err) {
//             console.error("Failed to update user offline status on disconnect:", err);
//           }
//         }
//       }
//     });
//   });

//   // Load chat socket module
//   const chatSocket = require("./chatSocket");
//   chatSocket(io);

//   // Chat Socket Sub-module initializes here
//   const OrderTrackSocket = require("./order-track-socket");
//   OrderTrackSocket(io);

//   return io;
// };

// const getIO = () => {
//   if (!io) throw new Error("Socket.io not initialized!");
//   return io;
// };

// module.exports = { initSocket, getIO };

const { Server } = require("socket.io");
const Order = require("./models/Order");
const User = require("./models/User");

// Active connected users map for real-time online presence
const onlineUsers = new Map(); // userId -> socketId

function initSocket(server) {
  const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    transports: ["websocket", "polling"],
  });

  io.use((socket, next) => {
    const userId = socket.handshake.auth?.userId || socket.handshake.query?.userId;
    if (!userId) return next(new Error("Authentication error: userId required"));
    socket.userId = userId;
    next();
  });

  io.on("connection", async (socket) => {
    const userId = socket.userId;
    onlineUsers.set(userId, socket.id);

    // Update online status in DB & broadcast presence
    await User.findByIdAndUpdate(userId, { isOnline: true, lastSeen: new Date() });
    io.emit("presence:changed", { userId, isOnline: true });
    socket.join(`user:${userId}`);

    // Join room handlers
    socket.on("joinOrderRoom", (orderId) => socket.join(`order:${orderId}`));
    socket.on("leaveOrderRoom", (orderId) => socket.leave(`order:${orderId}`));
    socket.on("joinAdminTracking", () => socket.join("role:admin"));

    // Rider Location Update & 2-Phase Route Telemetry
    socket.on("updateLocation", async (data) => {
      // data: { riderId, orderId, lat, lng, speed, heading }
      const { riderId, orderId, lat, lng, speed, heading } = data;
      const locationData = { lat, lng, speed, heading, updatedAt: new Date() };

      // Update Rider's real-time coordinate in DB
      await User.findByIdAndUpdate(riderId, { "location.coordinates": [lng, lat] });

      if (orderId) {
        const order = await Order.findById(orderId).populate("restaurantId customerId");
        if (order) {
          // Determine Delivery Phase
          let phase = "PICKUP"; // Default: Rider -> Restaurant
          let targetCoords = order.restaurantId.location.coordinates; // [lng, lat]

          if (["FOOD_PICKED", "ON_THE_WAY"].includes(order.status)) {
            phase = "DROP OFF"; // Rider -> Customer
            targetCoords = order.deliveryAddress.coordinates;
          }

          const telemetry = {
            phase,
            targetLocation: { lat: targetCoords[1], lng: targetCoords[0] },
            speed: speed || 0,
            heading: heading || 0,
          };

          // Broadcast to order room (Customer & Vendor)
          io.to(`order:${orderId}`).emit("liveRiderLocation", {
            location: { lat, lng },
            telemetry,
          });
        }
      }

      // Broadcast to Admin Tracking map
      io.to("role:admin").emit("riderLocationUpdated", {
        riderId,
        location: { lat, lng },
      });
    });

    // Handle Disconnect
    socket.on("disconnect", async () => {
      onlineUsers.delete(userId);
      await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: new Date() });
      io.emit("presence:changed", { userId, isOnline: false });
    });
  });

  return io;
}

module.exports = { initSocket, onlineUsers };