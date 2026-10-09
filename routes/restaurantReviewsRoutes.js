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
const upload = require("../middleware/upload");

// Public route to fetch reviews
router.get("/", getAllRestaurantReviews);

// Protected routes (User must be logged in)
router.post("/add", upload.diskUpload.single("image"), auth, addReview);
router.put("/:reviewId", upload.diskUpload.single("image"), auth, updateReview);
router.delete("/:reviewId", auth, deleteReview);

router.get("/restaurant/:restaurantId", getRestaurantReviews);

module.exports = router;