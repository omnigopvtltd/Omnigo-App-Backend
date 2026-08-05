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
  getRiderEarningByID,
} = require("../controllers/financeController");

router.get("/revenue", auth, role("admin"), getRevenueOverview);
router.get("/restaurant-earnings", auth, getRestaurantEarnings);
router.get("/rider-earnings", auth, getRiderEarnings);
router.get("/rider-earnings/:id", auth, getRiderEarningByID);
router.get("/commission", auth, getCommissionSummary);
router.get("/tax", auth, getTaxSummary);

router.get("/withdrawals", auth, getWithdrawRequests);
router.post("/withdraw", auth, createWithdrawRequest); // rider/restaurant self-service request
router.patch("/update/withdrawals/:id", auth, role("admin"), updateWithdrawRequestStatus);

router.get("/transactions", auth, getTransactions);

module.exports = router;