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
        // enum: ["fast-food", "grocery", "pharmacy", "bakery", "other"],
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

      variations: [
        {
          title: { type: String }, // e.g. "Size", "Flavour"
          options: [
            {
              name: { type: String }, // e.g. "Large", "Chocolate"
              price: { type: Number, default: 0 },
            },
          ],
        },
      ],
      addOns: [
        {
          name: String,
          price: { type: Number, default: 0 },
        },
      ],

      serving: { type: String, default: "full" },
      isVeg: { type: Boolean, default: false },

      total: Number,
    },
  ],
});

module.exports = mongoose.model("Cart", cartSchema);
