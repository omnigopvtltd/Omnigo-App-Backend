const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
  },

  name: String,          // snapshot
  price: Number,
  quantity: Number,
  variant: String,       // e.g. 500g
  image: String
});

const orderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },

  items: [orderItemSchema],

  address: {
    fullName: String,
    phone: String,
    street: String,
    city: String,
    country: String,
    zip: String
  },

  bill: {
    subtotal: Number,
    deliveryFee: Number,
    tax: Number,
    total: Number
  },

  status: {
    type: String,
    enum: ["pending", "confirmed", "assigned", "delivered", "cancelled"],
    default: "pending"
  },

  riderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  }

}, { timestamps: true });

module.exports = mongoose.model("Order", orderSchema);