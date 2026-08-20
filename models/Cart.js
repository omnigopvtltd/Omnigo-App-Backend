const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },

  items: [
        {
          orderFrom: {
            type: String,
            enum: ["fast-food", "grocery", "pharmacy", "bakery", "other"],
            default: "fast-food",
          },
          productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
          },
  
          name: String,
          image: String,
          category: String,
          weight: String,
  
          price: Number,
          quantity: Number,
  
          total: Number,
        },
      ],
  
});

module.exports = mongoose.model("Cart", cartSchema);