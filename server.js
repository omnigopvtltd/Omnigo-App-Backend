require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const path = require("path");
const wishlistRoutes = require("./routes/wishlistRoutes");
const feedbackRoutes = require("./routes/feedbackRoutes");
const chatRoutes = require("./routes/chatRoutes");
const connectDB = require("./config/db");
require("./config/firebase");
const orderRoutes = require("./routes/orderRoutes");
const restaurantRoutes = require("./routes/restaurantRoutes");
const couponRoutes = require("./routes/couponRoutes");
const campaignRoutes = require("./routes/campaignRoutes");
const financeRoutes = require("./routes/financeRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const foodCategoryRoutes = require("./routes/foodCategoryRoutes");
const homeChefRoutes = require("./routes/homeChefRoutes");
require("./config/firebase");

//  SOCKET
const { initSocket } = require("./socket");

const app = express();
const server = http.createServer(app);

const dns = require("node:dns");
dns.setServers(["1.1.1.1", "8.8.8.8"]);

require("dotenv").config();

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

// ================= VENDORS =================
app.use("/api/vendors", require("./routes/vendorRoutes"));

// ================= RIDERS =================
app.use("/api/admin", require("./routes/adminRoutes"));

// ================= RIDERS =================
app.use("/api/riders/sessions", require("./routes/riderSessionRoutes"));
app.use("/api/riders", require("./routes/riderRoutes"));
app.use(
  "/api/riders/verification",
  require("./routes/riderVerificationRoutes"),
);
app.use("/api/riders/wallet", require("./routes/riderWalletRoutes"));
app.use("/api/riders/orders", require("./routes/riderOrderFlowRoutes"));
// ================= Payments =================
const paymentRoutes = require("./routes/paymentRoutes");
app.use("/api/payments", paymentRoutes);
app.use("/api/finance", financeRoutes);
// ================= Tracking  =================
const trackingRoutes = require("./routes/trackingRoutes");
const AdminSettings = require("./models/AdminSettings");
const { getNotification } = require("./utils/sendNotification");
app.use("/api/tracking", trackingRoutes);

//  ================= Restaurant ===========================
// app.use("/api/restaurants/menu", require("./routes/menuRoutes"));
app.use("/api/orders", orderRoutes);
app.use("/api/restaurants", restaurantRoutes);
app.use("/api/homeChefs", homeChefRoutes);
app.use("/api/categories", foodCategoryRoutes);
app.use("/api/deals", require("./routes/dealRoutes"));
app.use("/api/restaurantReviews", require("./routes/restaurantReviewsRoutes"));

app.use("/api/onboarding", require("./routes/onboardingRoutes"));
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/campaigns", campaignRoutes);
app.use("/api/settings", AdminSettings);

app.use("/api/chat", require("./routes/chatRoutes"));
app.use("/api/calls", require("./routes/callRoutes"));
app.use("/api/search", require("./routes/searchRoutes"));
app.use("/api/notifications", require("./routes/notificationRoutes"));

// Fast Food //
// app.use("/api", categoryRoutes);
// ================= SOCKET INIT =================
const io = initSocket(server);

//  make io available globally in express
app.set("io", io);


// // ================= START SERVER =================
// server.listen(5000, () => {
//   console.log("Server running on port 5000");
// });

const PORT = process.env.PORT || 5000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});