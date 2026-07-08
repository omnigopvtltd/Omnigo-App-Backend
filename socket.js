// socket.js
let io;

const initSocket = (server) => {
  const { Server } = require("socket.io");
  
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST", "PUT", "DELETE"],
    },
  });

  // Global Connection Monitor (Optional but good for absolute main tracking)
  io.on("connection", (socket) => {
    console.log(`[Socket.io] New Raw Connection: ${socket.id}`);
    console.log("Total Engine Clients:", io.engine.clientsCount);

    socket.on("disconnect", () => {
      console.log(`[Socket.io] Raw Disconnected: ${socket.id}`);
      console.log("Total Engine Clients Remaining:", io.engine.clientsCount);
    });
  });

  // Chat Socket Sub-module initializes here
  const chatSocket = require("./chatSocket");
  chatSocket(io);
  
   // Chat Socket Sub-module initializes here
  const OrderTrackSocket = require("./order-track-socket");
  OrderTrackSocket(io);

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error("Socket not initialized");
  }
  return io;
};

module.exports = {
  initSocket,
  getIO,
};