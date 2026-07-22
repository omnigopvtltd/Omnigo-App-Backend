const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/rolemiddleware");
const {
  getLiveRiders,
  updateRiderLocation,
  getActiveDeliveries,
} = require("../controllers/trackingController");

router.get("/riders", auth, role("admin"), getLiveRiders);
router.get("/deliveries", auth, role("admin"), getActiveDeliveries);
router.patch("/location", auth, role("rider"), updateRiderLocation);

module.exports = router;