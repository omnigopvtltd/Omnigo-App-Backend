const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    images: [{ type: String }], // first image is treated as the primary/cover photo
    weight: { type: String, default: "" },
    quantity: { type: Number, default: 0 },

    belongsTo: {
      type: String,
      enum: [
        "restaurant",
        "home-chef",
        "grocery",
        "pharmacy",
        "stationary",
        "bakery",
      ],
      required: true,
    },

    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
    },

    // homeChefId: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: "HomeChef",
    // },

    category: { type: String, required: true, trim: true }, // e.g. "Pizza", "Beverages"
    subcategory: { type: String, default: "" }, // e.g. "Thin Crust"

    price: { type: Number, required: true, min: 0 },
    discountPrice: { type: Number, default: null, min: 0 },

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
    tags: [
      {
        icon: { type: String },
        tagName: { type: String },
      },
    ], // e.g. "Bestseller", "New", "Most Popular", "Chef's Special", "50% Off", "Limited Time Offer", "Spicy", "Gluten-Free", "Vegan", "Low-Carb", "Keto-Friendly", "Dairy-Free", "Sugar-Free", "Organic", "Farm-to-Table", "Locally Sourced", "Seasonal Special", "Chef's Recommendation"

    isAvailable: { type: Boolean, default: true }, // stock / sold-out toggle
    preparationTime: { type: Number, default: 15 }, // minutes

    rating: {
      average: { type: Number, default: 0 },
      count: { type: Number, default: 0 },
    },

    isFavourite: { type: Boolean, default: false },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    type: {
      type: String,
      enum: ["popular", "special", "new", "signature", "featured"],
      default: "new",
    },
  },
  { timestamps: true },
);

// productSchema.pre("validate", function (next) {
productSchema.pre("validate", function () {
  if (this.discountPrice != null && this.discountPrice >= this.price) {
    return next(
      new Error("Discount price must be less than the regular price"),
    );
  }
  // next();
});

productSchema.index({ name: "text", category: "text", tags: "text" });

module.exports = mongoose.model("Product", productSchema);
