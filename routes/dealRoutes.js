const express = require("express");
const router = express.Router();
const {
  getDeals,
  createDeal,
  updateDealStatus,
  getDealsByRestaurantId,
  getDailyDeals,
  getDealsById,
  getDealDetails,
} = require("../controllers/dealController");
const auth = require("../middleware/authMiddleware");

router.get("/", getDeals);
router.get("/daily", getDailyDeals);
router.get("/:id", getDealsById);
router.get("/deal-details/:id", getDealDetails);
router.post("/create",  createDeal);
router.get("/restaurant/:restaurantId", getDealsByRestaurantId);
router.patch("/:id/status", updateDealStatus);

module.exports = router;

// import { io } from "socket.io-client";

// const socket = io("http://YOUR_BACKEND_URL");

// // Listen for new deals published dynamically
// socket.on("newDealPublished", (data) => {
//   console.log("New Deal Alert:", data.deal);
//   // Prepend new deal to banner slider state array:
//   // setBanners(prev => [data.deal, ...prev]);
// });

// // Listen for deal expiration/removal
// socket.on("dealStatusChanged", (data) => {
//   if (!data.isActive) {
//     // Remove expired deal from banner slider state:
//     // setBanners(prev => prev.filter(deal => deal._id !== data.dealId));
//   }
// });