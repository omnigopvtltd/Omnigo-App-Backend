const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },

  items: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },

      name: {
        type: String,
        required: true,
        trim: true,
      },

      weight: {
        type: String,
        default: "",
      },

      price: {
        type: Number,
        required: true,
      },

      quantity: {
        type: Number,
        default: 1,
      },

      category: {
        type: String,
        default: "",
      },

      image: {
        type: String,
        default: "",
      },

      description: {
        type: String,
        default: "",
      },
    },
  ],
});

module.exports = mongoose.model("Cart", cartSchema);