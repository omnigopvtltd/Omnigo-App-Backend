const mongoose = require("mongoose");

const subCategorySchema = new mongoose.Schema(
  {
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    image: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: [
        "Most Popular",
        "Trending",
        "50% OFF",
        "New Arrival",
        "Recommended",
        "Best Seller",
        "Limited Time",
        "Hot Deal"
      ],
      default: "Most Popular",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("SubCategory", subCategorySchema);