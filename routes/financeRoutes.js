const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/rolemiddleware");
const {
  getRevenueOverview,
  getRestaurantEarnings,
  getRiderEarnings,
  getCommissionSummary,
  getTaxSummary,
  getWithdrawRequests,
  createWithdrawRequest,
  updateWithdrawRequestStatus,
  getTransactions,
} = require("../controllers/financeController");

router.get("/revenue", auth, role("admin"), getRevenueOverview);
router.get("/restaurant-earnings", auth, role("admin"), getRestaurantEarnings);
router.get("/rider-earnings", auth, role("admin"), getRiderEarnings);
router.get("/commission", auth, role("admin"), getCommissionSummary);
router.get("/tax", auth, role("admin"), getTaxSummary);

router.get("/withdrawals", auth, role("admin"), getWithdrawRequests);
router.post("/withdraw", auth, createWithdrawRequest); // rider/restaurant self-service request
router.patch("/update/withdrawals/:id", auth, role("admin"), updateWithdrawRequestStatus);

router.get("/transactions", auth, role("admin"), getTransactions);

module.exports = router;