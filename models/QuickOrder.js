// models/QuickOrder.js   (slip: user ke chune hue products + qeemat. Confirm nahi, "Add to cart" hota ha)
const mongoose = require("mongoose");
const { Schema } = mongoose;

const orderItemSchema = new Schema({
  name: { type: String, required: true },               // DB wala product naam
  requestedName: { type: String, default: "" },         // user ne jo likha tha
  brand: { type: String, default: "" },
  quantity: { type: Number, required: true, default: 1, min: 1, max: 50 },
  dosage: { type: String, default: "" },
  size: { type: String, default: "" },

  productId: { type: Schema.Types.ObjectId, ref: "Product", default: null },
  vendorId: { type: Schema.Types.ObjectId, ref: "Vendor", default: null },
  image: { type: String, default: "" },                 // STRING (Product.images[0])
  category: { type: String, default: "" },
  subcategory: { type: String, default: "" },
  weight: { type: String, default: "" },
  belongsTo: { type: String, default: "" },
  type: { type: String, default: "" },
  isRxRequired: { type: Boolean, default: false },
  isVeg: { type: Boolean, default: false },
  tags: { type: [Schema.Types.Mixed], default: [] },
  rating: { type: Schema.Types.Mixed, default: {} },

  // slip mein edit karne ke liye product ki available options
  variations: { type: [Schema.Types.Mixed], default: [] },
  addOns: { type: [Schema.Types.Mixed], default: [] },
  // user ka intikhab + qeemat ka hisab
  selectedVariations: { type: [Schema.Types.Mixed], default: [] },   // [{title, option, price}]
  selectedAddOns: { type: [Schema.Types.Mixed], default: [] },       // [{name, price}]
  basePrice: { type: Number, default: 0 },
  variationDefaulted: { type: Boolean, default: false },             // user ne nahi chuni, pehli option lagi

  matchStatus: { type: String, enum: ["SELECTED", "MATCHED", "SUGGESTED", "UNAVAILABLE", "CUSTOM"], default: "SELECTED" },
  estimatedUnitPrice: { type: Number, required: true, default: 0 },  // ek piece ki qeemat (base + variation + add-ons)
  totalItemPrice: { type: Number, required: true, default: 0 },      // unit x quantity
});

const quickOrderSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    category: { type: String, enum: ["food", "mart", "pharmacy", "grocery"], default: "food" },
    orderType: { type: String, enum: ["TEXT", "IMAGE"], default: "TEXT" },
    rawInputText: { type: String, default: "" },
    prescriptionImageUrl: { type: String, default: "" },
    parsedBy: { type: String, default: "" },

    items: [orderItemSchema],
    subtotal: { type: Number, required: true, default: 0 },
    deliveryFee: { type: Number, default: 200 },
    grandTotal: { type: Number, required: true, default: 0 },
    customerNotes: { type: String, default: "" },

    status: {
      type: String,
      enum: ["PROPOSED", "PRICE_UPDATED", "ADDING_TO_CART", "ADDED_TO_CART", "CONFIRMING", "CONFIRMED", "CANCELLED"],
      default: "PROPOSED",
    },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", default: null },
    priceAdjustments: [{ updatedBy: { type: String, enum: ["ADMIN", "RIDER"] }, reason: String, oldTotal: Number, newTotal: Number, timestamp: { type: Date, default: Date.now } }],
  },
  { timestamps: true }
);
quickOrderSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("QuickOrder", quickOrderSchema);