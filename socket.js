let io;

const initSocket = (server) => {
  const { Server } = require("socket.io");

  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST", "PUT", "DELETE"],
    },
  });

  //  SOCKET CONNECTION
  io.on("connection", (socket) => {

    console.log("User Connected:", socket.id);

    //  USER JOIN ROOM
    socket.on("join", (userId) => {

      socket.join(`user_${userId}`);

      console.log(`User Joined Room: user_${userId}`);
    });

    //  ADMIN ROOM
    socket.on("join_admin", () => {

      socket.join("admin_room");

      console.log("Admin Joined");
    });

    socket.on("disconnect", () => {
      console.log("User Disconnected");
    });
  });

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