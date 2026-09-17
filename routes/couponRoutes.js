const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/rolemiddleware");
const {
  createCoupon,
  getAllCoupons,
  getCouponById,
  updateCoupon,
  deleteCoupon,
  validateCoupon,
} = require("../controllers/couponController");

router.get("/", auth, role("admin"), getAllCoupons);
router.post("/create", auth, role("admin"), createCoupon);
router.put("/update/:id", auth, role("admin"), updateCoupon);
router.delete("/delete/:id", auth, role("admin"), deleteCoupon);

// Customer-facing — applied at checkout
router.post("/validate", auth, validateCoupon);
router.get("/:id", auth, role("admin"), getCouponById);

module.exports = router;