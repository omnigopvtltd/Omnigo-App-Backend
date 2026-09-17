const express = require("express");
const router = express.Router();
const {
  createHomeChef,
  getAllHomeChefs,
  getHomeChefById,
  updateHomeChef,
  deleteHomeChef,
  createChefDeal,
  getHomeChefCategories,
} = require("../controllers/homeChefController");

router.post("/create", createHomeChef);
router.get("/", getAllHomeChefs);
router.put("/update/:id", updateHomeChef);
router.delete("/delete/:id", deleteHomeChef);

// Add deal under chef
router.post("/:chefId/deals", createChefDeal);
router.get("/categories/:id", getHomeChefCategories);
router.get("/:id", getHomeChefById);

module.exports = router;