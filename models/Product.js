const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    price: {
      type: Number,
      required: true,
    },

    category: {
      type: String,
      required: true,
      index: true,
    },

    // ✅ IMAGE (already correct but improved comment)
    image: {
      type: String,
      default: "", // stores URL from /uploads OR cloudinary
    },

    stock: {
      type: Number,
      default: 0,
    },

    // ❤️ Likes system (good)
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    description: {
      type: String,
      default: "",
    },

    // 🆕 OPTIONAL (future upgrade fields)
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);