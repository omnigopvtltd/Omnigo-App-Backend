const mongoose = require("mongoose");

const restaurantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, unique: true },
    description: { type: String, default: "" },

    logo: { type: String, default: "" },
    coverImage: { type: String, default: "" },

    cuisines: [{ type: String }],

    // Optional link to a restaurant-owner account, if/when that role exists
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    contact: {
      phone: { type: String, required: true },
      email: { type: String, default: "" },
    },

    address: {
      street: { type: String, required: true },
      area: { type: String, default: "" },
      city: { type: String, required: true },
      zipCode: { type: String, default: "" },
      country: { type: String, default: "Pakistan" },
      // location: {
      //   type: { type: String, enum: ["Point"], default: "Point" },
      //   coordinates: { type: [Number], default: undefined }, // [lng, lat]
      // },
      // address: {
      //   street: { type: String, default: true },
      //   area: { type: String, default: "" },
      //   city: { type: String, required: true },
      //   zipCode: { type: String, default: "" },
      //   country: { type: String, default: "Pakistan" },
      // },
      // address: {
      //   type: String,
      //   required: true,
      // }
    },

    openingHours: {
      open: { type: String, default: "09:00" },
      close: { type: String, default: "23:00" },
      is24Hours: { type: Boolean, default: false },
    },
    isOpen: { type: Boolean, default: true },

    deliveryTime: {
      min: { type: Number, default: 20 },
      max: { type: Number, default: 40 },
    },
    minimumOrder: { type: Number, default: 0 },
    deliveryFee: { type: Number, default: 0 },
    commissionRate: { type: Number, default: 15 }, // %

    // Finance track and pay out restaurant earnings
    wallet: {
      balance: { type: Number, default: 0 },
    },

    rating: {
      average: { type: Number, default: 0 },
      count: { type: Number, default: 0 },
    },

    documents: [
      {
        name: String,
        url: String,
        verified: { type: Boolean, default: false },
      },
    ],

    status: {
      type: String,
      enum: ["pending", "approved", "blocked"],
      default: "pending",
    },
    isFeatured: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// Enables "restaurants near me" style geo queries later (Live Tracking phase)
// restaurantSchema.index({ "address.location": "2dsphere" });

// restaurantSchema.pre("save", function (next) {
restaurantSchema.pre("save", function () {
  if (this.isModified("name") || !this.slug) {
    this.slug =
      this.name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") +
      "-" +
      Date.now().toString(36); // keeps slug unique even for duplicate names
  }
  // next();
});

module.exports = mongoose.model("Restaurant", restaurantSchema);
