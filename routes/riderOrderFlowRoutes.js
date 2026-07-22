const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/rolemiddleware");
const {
  acceptOrderWithWallet,
  completeOrderDelivery,
} = require("../controllers/riderOrderFlowController");

router.put("/:id/accept", auth, role("rider"), acceptOrderWithWallet);
router.put("/:id/deliver", auth, role("rider"), completeOrderDelivery);

module.exports = router;