const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/rolemiddleware");
const {
  createRestaurant,
  getAllRestaurants,
  getRestaurantById,
  updateRestaurant,
  updateRestaurantStatus,
  deleteRestaurant,
  getAllRestaurantBrands,
} = require("../controllers/restaurantController");

router.get("/", auth, getAllRestaurants);
router.get("/brands", auth, getAllRestaurantBrands);
router.post("/create", auth, role("admin"), createRestaurant);
router.get("/:id", auth, role("admin"), getRestaurantById);
router.put("/update/:id", auth, role("admin"), updateRestaurant);
router.patch("/update/:id/status", auth, role("admin"), updateRestaurantStatus);
router.delete("/delete/:id", auth, role("admin"), deleteRestaurant);

module.exports = router;