const mongoose = require("mongoose");

const menuCategorySchema = new mongoose.Schema({
  categoryName: {
    type: String,
    required: true,
    trim: true,
  },
  products: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
    },
  ],
  deals: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Deal",
    },
  ],
});

const menuSchema = new mongoose.Schema(
  {
    belongsTo: {
      type: String,
      enum: ["Restaurant", "HomeChef"],
      required: true,
    },
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
    },
    homeChefId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HomeChef",
    },
    categories: [menuCategorySchema],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

menuSchema.index({ restaurantId: 1 });
menuSchema.index({ homeChefId: 1 });

module.exports = mongoose.model("Menu", menuSchema);