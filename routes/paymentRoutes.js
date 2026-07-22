const express = require("express");
const router = express.Router();
const { payVendorForOrder, completeOrderDelivery } = require("../controllers/orderPaymentController");
// const { protect, authorize } = require("../middleware/authMiddleware"); // Use your auth middleware
const auth = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/rolemiddleware");

// Rider buys inventory/food from vendor
router.post("/pay-vendor", auth, authorizeRoles("rider"), payVendorForOrder);

// Rider completes delivery and receives payment/earning
router.post("/complete-delivery", auth, authorizeRoles("rider"), completeOrderDelivery);

module.exports = router;