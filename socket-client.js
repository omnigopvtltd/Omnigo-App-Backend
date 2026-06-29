const io = require("socket.io-client");

const socket = io("http://localhost:5000");

socket.on("connect", () => {
  console.log("Connected:", socket.id);

  socket.emit(
    "join",
    "6a22b6644a4b879e3c210f02"
  );

  console.log(
    "Joined Room: user_6a22b6644a4b879e3c210f02"
  );
});

socket.onAny((event, data) => {
  console.log("EVENT:", event);
  console.log("DATA:", data);
});