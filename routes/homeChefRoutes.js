const express = require("express");
const router = express.Router();
const {
  createHomeChef,
  getAllHomeChefs,
  getChefById,
  updateHomeChef,
  deleteHomeChef,
  createChefDeal,
} = require("../controllers/homeChefController");

router.post("/create", createHomeChef);
router.get("/", getAllHomeChefs);
router.get("/:id", getChefById);
router.put("/:id", updateHomeChef);
router.delete("/:id", deleteHomeChef);

// Add deal under chef
router.post("/:chefId/deals", createChefDeal);

module.exports = router;