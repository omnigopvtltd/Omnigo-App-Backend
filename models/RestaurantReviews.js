const mongoose = require("mongoose");

const restaurantReviews = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    restaurantId: {
        type: mongoose.Schema.Types.ObjectId,   
        ref: "Restaurant",
        required: true,
    },

    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },

    reviewType: {
      type: String,
      enum: [
        "very_bad",
        "bad",
        "average",
        "good",
        "excellent",
      ],
    },

    message: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
    image: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("RestaurantReview", restaurantReviews);