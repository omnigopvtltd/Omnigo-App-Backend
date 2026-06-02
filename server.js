require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const path = require("path");

const connectDB = require("./config/db");

//  SOCKET
const { initSocket } = require("./socket");

const app = express();
const server = http.createServer(app);

// ================= DB =================
connectDB();

// ================= MIDDLEWARE =================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//  static uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ================= ROUTES =================
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/products", require("./routes/productRoutes"));
app.use("/api/cart", require("./routes/cartRoutes"));
app.use("/api/address", require("./routes/addressRoutes"));
app.use("/api/orders", require("./routes/orderRoutes"));

// ================= SOCKET INIT =================
const io = initSocket(server);

//  make io available globally in express
app.set("io", io);

// ================= START SERVER =================
server.listen(5000, () => {
  console.log("Server running on port 5000");
});