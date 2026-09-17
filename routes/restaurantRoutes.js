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
  getRestaurantByFastDeliveryTime,
  getRestaurantCategories,
  restaurantMenu,
} = require("../controllers/restaurantController");

router.get("/", auth, getAllRestaurants);
router.get("/brands", auth, getAllRestaurantBrands);
router.get("/fast-delivery", auth, getRestaurantByFastDeliveryTime);
router.post("/create", auth, role("admin"), createRestaurant);
router.put("/update/:id", auth, role("admin"), updateRestaurant);
router.patch("/update/:id/status", auth, role("admin"), updateRestaurantStatus);
router.delete("/delete/:id", auth, role("admin"), deleteRestaurant);

router.get("/menu/:restaurantId", auth, restaurantMenu);
router.get("/categories/:id", auth, getRestaurantCategories);
router.get("/:id", auth, getRestaurantById);
module.exports = router;