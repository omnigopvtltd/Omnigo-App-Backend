// models/QuickOrder.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const alternativeSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product" },
    name: String,
    price: Number,
    image: String,
    confidence: Number,
  },
  { _id: false }
);

const orderItemSchema = new Schema({
  name: { type: String, required: true },            // slip par jo naam dikhana ha (matched ho to DB wala naam)
  requestedName: { type: String, default: "" },      // user ne jo likha tha
  brand: { type: String, default: "" },
  quantity: { type: Number, required: true, default: 1, min: 1, max: 50 },
  dosage: { type: String, default: "" },             // "500mg" (Pharmacy)
  size: { type: String, default: "" },

  // ---- DB matching ----
  productId: { type: Schema.Types.ObjectId, ref: "Product", default: null },
  vendorId: { type: Schema.Types.ObjectId, ref: "Vendor", default: null },
  image: { type: String, default: "" },
  matchStatus: {
    type: String,
    enum: ["MATCHED", "SUGGESTED", "UNAVAILABLE", "CUSTOM"],
    default: "UNAVAILABLE",
  },
  matchConfidence: { type: Number, default: 0 },
  alternatives: { type: [alternativeSchema], default: [] },
  needsPriceConfirmation: { type: Boolean, default: false }, // CUSTOM (pharmacy) items

  estimatedUnitPrice: { type: Number, required: true, default: 0 },
  totalItemPrice: { type: Number, required: true, default: 0 },
});

const quickOrderSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    category: { type: String, enum: ["food", "mart", "pharmacy", "grocery"], default: "food" },
    orderType: { type: String, enum: ["TEXT", "IMAGE"], default: "TEXT" },
    rawInputText: { type: String, default: "" },
    prescriptionImageUrl: { type: String, default: "" },
    parsedBy: { type: String, default: "" },         // kaunsa AI model / "fallback-parser" (debugging ke liye)

    items: [orderItemSchema],
    subtotal: { type: Number, required: true, default: 0 },
    deliveryFee: { type: Number, default: 200 },
    grandTotal: { type: Number, required: true, default: 0 },
    customerNotes: { type: String, default: "" },

    status: {
      type: String,
      enum: ["PROPOSED", "PRICE_UPDATED", "CONFIRMING", "CONFIRMED", "CANCELLED"],
      default: "PROPOSED",
    },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", default: null },

    priceAdjustments: [
      {
        updatedBy: { type: String, enum: ["ADMIN", "RIDER"] },
        reason: String,
        oldTotal: Number,
        newTotal: Number,
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

quickOrderSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("QuickOrder", quickOrderSchema);