const mongoose = require("mongoose");

const restaurantSubCategorySchema = new mongoose.Schema(
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

    name: {
      type: String,
      required: true,
    },

    image: String,

    status: {
      type: String,
      enum: [
        "Most Popular",
        "Trending",
        "New",
        "50% OFF",
        "Hot Deal",
      ],
      default: "",
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "RestaurantSubCategory",
  restaurantSubCategorySchema
);