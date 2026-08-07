const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const {
  addReview,
  getRestaurantReviews,
  updateReview,
  deleteReview,
  getAllRestaurantReviews
} = require("../controllers/restaurantReviewsController");

// Public route to fetch reviews
router.get("/", getAllRestaurantReviews);
router.get("/restaurant/:restaurantId", getRestaurantReviews);

// Protected routes (User must be logged in)
router.post("/add", auth, addReview);
router.put("/:reviewId", auth, updateReview);
router.delete("/:reviewId", auth, deleteReview);

module.exports = router;