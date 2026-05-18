const router = require("express").Router();

const auth = require("../middleware/authMiddleware");
const role = require("../middleware/rolemiddleware");

const {
  createOrder,
  getMyOrders,
  getSingleOrder,
  getAllOrders,
  assignRider,
  getRiderOrders,
  updateStatus
} = require("../controllers/orderController");


// ================= USER ROUTES =================

// Create Order
router.post("/", auth, createOrder);

// Get My Orders
router.get("/my", auth, getMyOrders);


// ================= RIDER ROUTES =================

// Get Rider Orders (⚠️ pehle rakho)
router.get("/rider/my", auth, role("rider"), getRiderOrders);

// Update Order Status
router.put("/:id/status", auth, role("rider"), updateStatus);


// ================= ADMIN ROUTES =================

// Get All Orders
router.get("/admin/all", auth, role("admin", "superadmin"), getAllOrders);

// Assign Rider
router.put("/:id/assign", auth, role("admin", "superadmin"), assignRider);


// ================= COMMON =================

// Get Single Order (⚠️ hamesha LAST me)
router.get("/:id", auth, getSingleOrder);


module.exports = router;