// // socket.js
// const { Server } = require("socket.io");
// const Order = require("./models/Order");
// const User = require("./models/User");

// // Import socket modules
// const trackingSocket = require("./socket/trackingSocket");
// const chatSocket = require("./socket/chatSocket");

// const onlineUsers = new Map();

// function initSocket(server) {
//   const io = new Server(server, {
//     cors: { origin: "*", methods: ["GET", "POST", "PATCH", "PUT"] },
//     transports: ["websocket", "polling"],
//   });

//   io.use((socket, next) => {
//     const userId = socket.handshake.auth?.user.id || socket.handshake.query?.userId;
//     if (!userId) return next(new Error("Authentication error: userId required"));
//     socket.userId = userId;
//     next();
//   });

//   io.on("connection", async (socket) => {
//     const userId = socket.userId;
//     onlineUsers.set(userId, socket.id);

//     await User.findByIdAndUpdate(userId, { isOnline: true, lastSeen: new Date() });
//     io.emit("presence:changed", { userId, isOnline: true });
    
//     // Unified room naming convention: "order:123"
//     socket.join(`user:${userId}`);
//     socket.join(userId);

//     // Standardized Room Handlers across all roles
//     socket.on("joinOrderRoom", (orderId) => {
//       socket.join(`order:${orderId}`);
//       console.log(`Socket ${socket.id} joined order:${orderId}`);
//     });

//     socket.on("leaveOrderRoom", (orderId) => {
//       socket.leave(`order:${orderId}`);
//     });

//     // Admin room
//     socket.on("joinAdminTracking", () => {
//       socket.join("role:admin");
//       console.log(`Admin ${socket.id} joined role:admin`);
//     });

//     // Handle Disconnect
//     socket.on("disconnect", async () => {
//       onlineUsers.delete(userId);
//       await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: new Date() });
//       io.emit("presence:changed", { userId, isOnline: false });
//     });
//   });

//   // // Attach Sub-Socket Modules
//   // trackingSocket(io);
//   // chatSocket(io);

//   // return io;
//   // Attach Sub-Socket Modules with onlineUsers Map passed cleanly
//   if (typeof trackingSocket === "function") trackingSocket(io, onlineUsers);
//   if (typeof chatSocket === "function") chatSocket(io, onlineUsers);

//   return io;
// }

// module.exports = { initSocket, onlineUsers };

// socket.js
const { Server } = require("socket.io");
const Order = require("./models/Order");
const User = require("./models/User");
const Vendor = require("./models/Vendor");

// Import socket modules
const trackingSocket = require("./socket/trackingSocket");
const chatSocket = require("./socket/chatSocket");

const onlineUsers = new Map();

function initSocket(server) {
  const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST", "PATCH", "PUT"] },
    transports: ["websocket", "polling"],
  });

  // 1. Authentication Middleware
  io.use((socket, next) => {
    // Safe Optional Chaining (Crash-proof extraction)
    const userId =
      socket.handshake.auth?.user?.id ||
      socket.handshake.auth?.userId ||
      socket.handshake.query?.userId;

    const vendorId =
      socket.handshake.auth?.vendorId ||
      socket.handshake.query?.vendorId;

    const role = socket.handshake.auth?.role || socket.handshake.query?.role || "user";

    if (!userId && !vendorId) {
      return next(new Error("Authentication error: userId or vendorId required"));
    }

    // Attach extracted properties to socket instance
    socket.userId = userId || vendorId;
    socket.vendorId = vendorId || null;
    socket.role = role;

    next();
  });

  // 2. Main Socket Connection Handler
  io.on("connection", async (socket) => {
    const userId = socket.userId;
    onlineUsers.set(userId, socket.id);

    // Update Presence Status safely
    try {
      if (socket.role === "vendor" || socket.vendorId) {
        await Vendor.findByIdAndUpdate(userId, { isOnline: true, lastSeen: new Date() }).catch(() => {});
      } else {
        await User.findByIdAndUpdate(userId, { isOnline: true, lastSeen: new Date() }).catch(() => {});
      }
    } catch (err) {
      console.error("Presence update error:", err.message);
    }

    io.emit("presence:changed", { userId, isOnline: true });

    // Unified room joining conventions
    socket.join(`user:${userId}`);
    socket.join(userId);

    if (socket.vendorId) {
      socket.join(`vendor:${socket.vendorId}`);
      console.log(`Vendor ${socket.id} joined room vendor:${socket.vendorId}`);
    }

    // Standardized Order Room Handlers
    socket.on("joinOrderRoom", (orderId) => {
      if (orderId) {
        socket.join(`order:${orderId}`);
        console.log(`Socket ${socket.id} joined order:${orderId}`);
      }
    });

    socket.on("leaveOrderRoom", (orderId) => {
      if (orderId) {
        socket.leave(`order:${orderId}`);
      }
    });

    // Admin room
    socket.on("joinAdminTracking", () => {
      socket.join("role:admin");
      console.log(`Admin ${socket.id} joined role:admin`);
    });

    // Handle Disconnect safely
    socket.on("disconnect", async () => {
      onlineUsers.delete(userId);

      try {
        if (socket.role === "vendor" || socket.vendorId) {
          await Vendor.findByIdAndUpdate(userId, { isOnline: false, lastSeen: new Date() }).catch(() => {});
        } else {
          await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: new Date() }).catch(() => {});
        }
      } catch (err) {
        console.error("Disconnect presence error:", err.message);
      }

      io.emit("presence:changed", { userId, isOnline: false });
    });
  });

  // Attach Sub-Socket Modules cleanly
  if (typeof trackingSocket === "function") trackingSocket(io, onlineUsers);
  if (typeof chatSocket === "function") chatSocket(io, onlineUsers);

  return io;
}

module.exports = { initSocket, onlineUsers };