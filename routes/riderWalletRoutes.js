const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/rolemiddleware");
const {
  getMyWallet,
  getRiderWallet,
  topUpWallet,
  adjustRiderWallet,
  getTransactions,
} = require("../controllers/riderWalletController");

// Rider self-service
router.get("/me/", auth, role("rider"), getMyWallet);
router.get("/transactions", auth, role("rider"), getTransactions);
router.post("/topup", auth, role("rider"), topUpWallet);

// Admin
router.get("/:id", auth, role("admin"), getRiderWallet);
router.get("/:id/transactions", auth, role("admin"), getTransactions);
router.post("/:id/adjust", auth, role("admin"), adjustRiderWallet);

module.exports = router;