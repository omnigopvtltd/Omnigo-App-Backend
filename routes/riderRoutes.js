const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/rolemiddleware");
const {
  createRider,
  getAllRiders,
  getRiderById,
  updateRider,
  updateRiderBlockStatus,
  deleteRider,
} = require("../controllers/riderController");

router.get("/", auth, role("admin"), getAllRiders);
router.post("/create", auth, role("admin"), createRider);
router.get("/:id", auth,  getRiderById);
router.put("/update/:id", auth, role("admin"), updateRider);
router.patch("/update/:id/block", auth, role("admin"), updateRiderBlockStatus);
router.delete("/delete/:id", auth, role("admin"), deleteRider);

module.exports = router;