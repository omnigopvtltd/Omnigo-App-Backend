const mongoose = require("mongoose");

const fastFoodProductSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
    },

    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RestaurantCategory",
      required: true,
    },

    subCategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RestaurantSubCategory",
      required: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    image: {
      type: String,
      required: true,
    },

    gallery: [
      {
        type: String,
      },
    ],

    price: {
      type: Number,
      required: true,
    },

    discountPrice: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: [
        "Normal",
        "Most Popular",
        "Featured",
        "Recommended",
        "Trending",
        "50% OFF",
        "Hot Deal",
        "New Arrival",
      ],
      default: "Normal",
    },

    preparationTime: {
      type: Number,
      default: 20,
    },

    rating: {
      type: Number,
      default: 0,
    },

    totalReviews: {
      type: Number,
      default: 0,
    },

    ingredients: [
      {
        type: String,
      },
    ],

    calories: {
      type: Number,
      default: 0,
    },

    isVeg: {
      type: Boolean,
      default: false,
    },

    isFeatured: {
      type: Boolean,
      default: false,
    },

    isPopular: {
      type: Boolean,
      default: false,
    },

    isRecommended: {
      type: Boolean,
      default: false,
    },

    isAvailable: {
      type: Boolean,
      default: true,
    },

    sold: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "FastFoodProduct",
  fastFoodProductSchema
);