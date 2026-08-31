// socket.js
const { Server } = require("socket.io");
const Order = require("./models/Order");
const User = require("./models/User");

// Import socket modules
const trackingSocket = require("./socket/trackingSocket");
const chatSocket = require("./socket/chatSocket");

const onlineUsers = new Map();

function initSocket(server) {
  const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST", "PATCH", "PUT"] },
    transports: ["websocket", "polling"],
  });

  io.use((socket, next) => {
    const userId = socket.handshake.auth?.user.id || socket.handshake.query?.userId;
    if (!userId) return next(new Error("Authentication error: userId required"));
    socket.userId = userId;
    next();
  });

  io.on("connection", async (socket) => {
    const userId = socket.userId;
    onlineUsers.set(userId, socket.id);

    await User.findByIdAndUpdate(userId, { isOnline: true, lastSeen: new Date() });
    io.emit("presence:changed", { userId, isOnline: true });
    
    // Unified room naming convention: "order:123"
    socket.join(`user:${userId}`);
    socket.join(userId);

    // Standardized Room Handlers across all roles
    socket.on("joinOrderRoom", (orderId) => {
      socket.join(`order:${orderId}`);
      console.log(`Socket ${socket.id} joined order:${orderId}`);
    });

    socket.on("leaveOrderRoom", (orderId) => {
      socket.leave(`order:${orderId}`);
    });

    // Admin room
    socket.on("joinAdminTracking", () => {
      socket.join("role:admin");
      console.log(`Admin ${socket.id} joined role:admin`);
    });

    // Handle Disconnect
    socket.on("disconnect", async () => {
      onlineUsers.delete(userId);
      await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: new Date() });
      io.emit("presence:changed", { userId, isOnline: false });
    });
  });

  // // Attach Sub-Socket Modules
  // trackingSocket(io);
  // chatSocket(io);

  // return io;
  // Attach Sub-Socket Modules with onlineUsers Map passed cleanly
  if (typeof trackingSocket === "function") trackingSocket(io, onlineUsers);
  if (typeof chatSocket === "function") chatSocket(io, onlineUsers);

  return io;
}

module.exports = { initSocket, onlineUsers };