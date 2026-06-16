const express = require("express");
const router = express.Router();

const auth =
  require("../middleware/authMiddleware");

const {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
  confirmOrder,
} = require("../controllers/orderController");

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
module.exports = router;