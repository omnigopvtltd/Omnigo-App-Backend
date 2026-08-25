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
} = require("../controllers/orderController");


router.get("/all-orders", auth, role("admin", "superadmin"), getAllOrders);

router.get("/available", auth, getAvailableOrders);
router.get("/ongoing", auth, getOngoingOrders);

router.get("/details/:id", auth, getOrderDetails);

// CREATE ORDER
router.post("/create", auth, createOrder);

// ALL MY ORDERS
router.get("/my-orders", auth, getMyOrders);

// SINGLE ORDER
router.get("/:id", auth, getOrderById);

// router.get("/ongoing", auth, getOngoingOrders);

// CANCEL ORDER
router.put("/cancel/:id", auth, cancelOrder);
// CONFIRM ORDER
router.put("/confirm/:id", auth, confirmOrder);

router.get("/rider/available", auth, getAvailableOrders);
router.patch("/rider/auto-accept", auth, toggleAutoAccept);

router.put("/rider/accept/:id", auth, role("rider"), acceptOrder);
router.put("/rider/cancel/:id", auth, cancelRiderOrder);

router.get("/rider/my-orders", auth, role("rider"), getRiderOrders);
router.get("/rider/active-orders", auth, role("rider"), getRiderActiveOrders);

router.put("/rider/deliver/:id", auth, role("rider"), markDelivered);
router.post("/reorder/:id", auth, reorder);
router.get("/track/:id", auth, trackOrder);
router.put("/status/:id", auth, updateOrderStatus);
router.patch("/status/:id", auth, updateOrderStatus);
router.put("/:orderId/stops/:stopId/status", auth, updateOrderStatus);

module.exports = router;
