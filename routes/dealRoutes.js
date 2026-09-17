// const express = require("express");
// const router = express.Router();
// const {
//   getDeals,
//   createDeal,
//   updateDealStatus,
//   getDealsByRestaurantId,
//   getDailyDeals,
//   getDealsById,
//   getDealDetails,
// } = require("../controllers/dealController");
// const auth = require("../middleware/authMiddleware");

// router.get("/", getDeals);
// router.get("/daily", getDailyDeals);
// router.get("/:id", getDealsById);
// router.get("/deal-details/:id", getDealDetails);
// router.post("/create",  createDeal);
// router.get("/restaurant/:restaurantId", getDealsByRestaurantId);
// router.patch("/:id/status", updateDealStatus);

// module.exports = router;

// // import { io } from "socket.io-client";

// // const socket = io("http://YOUR_BACKEND_URL");

// // // Listen for new deals published dynamically
// // socket.on("newDealPublished", (data) => {
// //   console.log("New Deal Alert:", data.deal);
// //   // Prepend new deal to banner slider state array:
// //   // setBanners(prev => [data.deal, ...prev]);
// // });

// // // Listen for deal expiration/removal
// // socket.on("dealStatusChanged", (data) => {
// //   if (!data.isActive) {
// //     // Remove expired deal from banner slider state:
// //     // setBanners(prev => prev.filter(deal => deal._id !== data.dealId));
// //   }
// // });

// const express = require("express");
// const router = express.Router();
// const auth = require("../middleware/authMiddleware");
// const role = require("../middleware/rolemiddleware");
// const {
//   createCampaign,
//   getAllCampaigns,
//   getCampaignById,
//   updateCampaign,
//   deleteCampaign,
// } = require("../controllers/campaignController");

// router.get("/", auth, role("admin"), getAllCampaigns);
// router.post("/create", auth, role("admin"), createCampaign);
// router.get("/:id", auth, role("admin"), getCampaignById);
// router.put("/update/:id", auth, role("admin"), updateCampaign);
// router.delete("/delete/:id", auth, role("admin"), deleteCampaign);

// module.exports = router;

const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/rolemiddleware");
const {
  createDeal,
  getAllDeals,
  getDealById,
  updateDeal,
  deleteDeal,
  toggleDealAvailability,
  getDealFormConfig,
  getAllVendorDeals
} = require("../controllers/dealController");


// Get dynamic form configuration
router.get("/form-config", getDealFormConfig);

// Other Deal routes
router.post("/", createDeal);
router.get("/", getAllDeals);
router.put("/:id", updateDeal);
router.patch("/:id", toggleDealAvailability); // New route for toggling status
router.delete("/:id", deleteDeal);

router.get("/vendor/:vendorId", getAllVendorDeals);
router.get("/:id([0-9a-fA-F]{24})", getDealById);

module.exports = router;
