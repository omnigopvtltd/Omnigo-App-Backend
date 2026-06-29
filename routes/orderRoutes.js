const express = require("express");
const router = express.Router();

  const auth = require("../middleware/authMiddleware");
const role = require("../middleware/rolemiddleware");

const {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
  confirmOrder,
  getOngoingOrders,
  getAvailableOrders,
  acceptOrder,
  getRiderOrders,
  markDelivered,
  getOrderDetails,
  reorder,
  trackOrder,
  updateOrderStatus,

} = require("../controllers/orderController");

router.get(
  "/ongoing",
  auth,
  getOngoingOrders
);

router.get(
  "/details/:id",
  auth,
  getOrderDetails
);

// CREATE ORDER
router.post(
  "/create",
  auth,
  createOrder
);

// ALL MY ORDERS
router.get(
  "/my-orders",
  auth,
  getMyOrders
);

// SINGLE ORDER
router.get(
  "/:id",
  auth,
  getOrderById
);

router.get(
  "/ongoing",
  auth,
  getOngoingOrders
);

// CANCEL ORDER
router.put(
  "/cancel/:id",
  auth,
  cancelOrder
);
// CONFIRM ORDER
router.put(
  "/confirm/:id",
  auth,
  confirmOrder
);

router.get(
  "/rider/available",
  auth,
  role("rider"),
  getAvailableOrders
);

router.put(
  "/rider/accept/:id",
  auth,
  role("rider"),
  acceptOrder
);

router.get(
  "/rider/my-orders",
  auth,
  role("rider"),
  getRiderOrders
);

router.put(
  "/rider/deliver/:id",
  auth,
  role("rider"),
  markDelivered
);
router.post(
  "/reorder/:id", 
  auth, 
  reorder
);
router.get(
  "/track/:id", 
  auth, 
  trackOrder
);
// router.put("/status/:id", auth, updateOrderStatus);
router.patch(
  "/status/:id",
  auth,
  updateOrderStatus
);

module.exports = router;