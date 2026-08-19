const express = require("express");
const router = express.Router();
const {
  getMenu,
  toggleProductAvailability,
  configureMenu,
  createMenu,
} = require("../controllers/menuController");
const { getRestaurantById } = require("../controllers/restaurantController");

router.post("/create", createMenu);
router.get("/", getMenu);
router.get("/:id", getRestaurantById);

// Admin / Vendor Routes
router.patch("/product/:id/toggle-availability", toggleProductAvailability);
router.post("/configure", configureMenu);

module.exports = router;