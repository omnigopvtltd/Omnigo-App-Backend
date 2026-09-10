const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const role = require("../middleware/rolemiddleware");
const {
  getAllOrders,
  getOngoingOrders,
  getOrderDetails,
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
  confirmOrder,
  getAvailableOrders,
  toggleAutoAccept,
  acceptOrder,
  getRiderOrders,
  getRiderActiveOrders,
  markDelivered,
  reorder,
  trackOrder,
  updateOrderStatus,
  cancelRiderOrder,
  getVendorIncomingOrders,
  getVendorOrders,
  readyOrder,
  cancelOrderByVendor,
  raiseOrderIssueByUser,
} = require("../controllers/orderController");

const {completeOrderDelivery} = require("../controllers/riderOrderFlowController");


router.get("/all-orders", auth, role("admin", "superadmin"), getAllOrders);

router.get("/available", auth, getAvailableOrders);
router.get("/ongoing", auth, getOngoingOrders);

router.get("/details/:id", auth, getOrderDetails);

// CREATE ORDER
router.post("/create", auth, createOrder);

// ALL MY ORDERS
router.get("/my-orders", auth, getMyOrders);

// SINGLE ORDER
router.get("/vendor-orders", auth, role("vendor"), getVendorOrders);
router.get("/:id", auth, getOrderById);

// router.get("/ongoing", auth, getOngoingOrders);

// CANCEL ORDER
router.put("/cancel/:id", auth, cancelOrder);
// CONFIRM ORDER
router.put("/confirm/:id", auth, confirmOrder);
router.put("/ready/:id", auth, readyOrder);
router.put(
  "/vendor/cancel/:id",
  auth,
  cancelOrderByVendor
);

// Customer/User Route: Raise Issue or Request Refund
router.post(
  "/user/:orderId/raise-issue",
  auth,
  raiseOrderIssueByUser
);

router.get("/rider/available", auth, getAvailableOrders);
router.patch("/rider/auto-accept", auth, toggleAutoAccept);

router.put("/rider/accept/:id", auth, role("rider"), acceptOrder);
router.put("/rider/cancel/:id", auth, cancelRiderOrder);

router.get("/rider/my-orders", auth, role("rider"), getRiderOrders);
router.get("/rider/active-orders", auth, role("rider"), getRiderActiveOrders);

// router.put("/rider/deliver/:id", auth, role("rider"), markDelivered);
router.put("/rider/deliver/:id", auth, role("rider"), completeOrderDelivery);
router.post("/reorder/:id", auth, reorder);
router.get("/track/:id", auth, trackOrder);
router.put("/status/:id", auth, updateOrderStatus);
router.patch("/status/:id", auth, updateOrderStatus);
router.put("/:orderId/stops/:stopId/status", auth, updateOrderStatus);

// vendor routes
// router.get("/vendor/orders/:id", auth, role("vendor"), getOrderById);
// router.put("/vendor/orders/:id/cancel", auth, role("vendor"), cancelOrder);
// router.put("/vendor/orders/:id/confirm", auth, role("vendor"), confirmOrder);
module.exports = router;
