const RestaurantReview = require("../models/RestaurantReviews");
const Restaurant = require("../models/Restaurant");
const mongoose = require("mongoose");

// Helper function to map numerical rating to reviewType enum
const getReviewTypeFromRating = (rating) => {
  if (rating === 1) return "very_bad";
  if (rating === 2) return "bad";
  if (rating === 3) return "average";
  if (rating === 4) return "good";
  if (rating === 5) return "excellent";
  return "average";
};

// Helper function to recalculate and update restaurant average rating
const updateRestaurantRatingStats = async (restaurantId) => {
  const stats = await RestaurantReview.aggregate([
    { $match: { restaurantId: new mongoose.Types.ObjectId(restaurantId) } },
    {
      $group: {
        _id: "$restaurantId",
        averageRating: { $avg: "$rating" },
        count: { $sum: 1 },
      },
    },
  ]);

  if (stats.length > 0) {
    await Restaurant.findByIdAndUpdate(restaurantId, {
      "rating.average": parseFloat(stats[0].averageRating.toFixed(1)),
      "rating.count": stats[0].count,
    });
  } else {
    // Reset to defaults if no reviews remain
    await Restaurant.findByIdAndUpdate(restaurantId, {
      "rating.average": 0,
      "rating.count": 0,
    });
  }
};

// ========================================================
// 1. ADD NEW REVIEW
// ========================================================
exports.addReview = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id; // From auth middleware
    const { restaurantId, rating, reviewType, message, image } = req.body;

    if (!restaurantId || !rating) {
      return res.status(400).json({
        success: false,
        message: "restaurantId and rating are required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid restaurantId format",
      });
    }

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found",
      });
    }

    // Check if user already reviewed this restaurant (Optional: prevent duplicate reviews)
    const existingReview = await RestaurantReview.findOne({
      user: userId,
      restaurantId,
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: "You have already reviewed this restaurant. Update your existing review instead.",
      });
    }

    // Auto-assign reviewType if not passed in body
    const finalReviewType = reviewType || getReviewTypeFromRating(Number(rating));

    const newReview = await RestaurantReview.create({
      user: userId,
      restaurantId,
      rating,
      reviewType: finalReviewType,
      message: message || "",
      image: image || "",
    });

    // 🌟 Recalculate restaurant rating stats
    await updateRestaurantRatingStats(restaurantId);

    const populatedReview = await newReview.populate("user", "name avatar email");

    return res.status(201).json({
      success: true,
      message: "Review submitted successfully",
      review: populatedReview,
    });
  } catch (err) {
    console.error("ADD REVIEW ERROR:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ========================================================
// 2. GET ALL REVIEWS FOR A SPECIFIC RESTAURANT
// ========================================================
exports.getRestaurantReviews = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid restaurantId format",
      });
    }

    const reviews = await RestaurantReview.find({ restaurantId })
      .populate("user", "name avatar")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const totalReviews = await RestaurantReview.countDocuments({ restaurantId });

    return res.status(200).json({
      success: true,
      count: reviews.length,
      totalReviews,
      totalPages: Math.ceil(totalReviews / limit),
      currentPage: Number(page),
      reviews,
    });
  } catch (err) {
    console.error("GET REVIEWS ERROR:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ========================================================
// 2. GET ALL REVIEWS 
// ========================================================
exports.getAllRestaurantReviews = async (req, res) => {
  try {

    const reviews = await RestaurantReview.find()
      .populate("user", "name rating message")
      .populate("restaurantId", "name logo")
      .sort({ createdAt: -1 })

    return res.status(200).json({
      success: true,
      reviews,
    });
  } catch (err) {
    console.error("GET REVIEWS ERROR:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ========================================================
// 3. UPDATE REVIEW
// ========================================================
exports.updateReview = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { reviewId } = req.params;
    const { rating, reviewType, message, image } = req.body;

    const review = await RestaurantReview.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    // Ensure user owns this review
    if (review.user.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to update this review",
      });
    }

    if (rating) {
      review.rating = rating;
      review.reviewType = reviewType || getReviewTypeFromRating(Number(rating));
    }
    if (message !== undefined) review.message = message;
    if (image !== undefined) review.image = image;

    await review.save();

    // 🌟 Recalculate restaurant rating stats
    await updateRestaurantRatingStats(review.restaurantId);

    return res.status(200).json({
      success: true,
      message: "Review updated successfully",
      review,
    });
  } catch (err) {
    console.error("UPDATE REVIEW ERROR:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ========================================================
// 4. DELETE REVIEW
// ========================================================
exports.deleteReview = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { reviewId } = req.params;

    const review = await RestaurantReview.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    // Allow author or admin to delete
    if (review.user.toString() !== userId.toString() && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to delete this review",
      });
    }

    const restaurantId = review.restaurantId;
    await review.deleteOne();

    // 🌟 Recalculate restaurant rating stats
    await updateRestaurantRatingStats(restaurantId);

    return res.status(200).json({
      success: true,
      message: "Review deleted successfully",
    });
  } catch (err) {
    console.error("DELETE REVIEW ERROR:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};