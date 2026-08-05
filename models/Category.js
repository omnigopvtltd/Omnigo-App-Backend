const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
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

module.exports = mongoose.model("Category", categorySchema);