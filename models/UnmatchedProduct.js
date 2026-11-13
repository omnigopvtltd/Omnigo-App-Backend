// models/UnmatchedProduct.js
// Jo cheezein users ne maangi magar hamare pas nahi thin. Har entry ke subscribers = wo users jinhein "available" hone par notification jayegi.
const mongoose = require("mongoose");

const unmatchedProductSchema = new mongoose.Schema(
  {
    normalizedName: { type: String, required: true },   // lafzon ki tarteeb se azad key ("hot pot" == "pot hot")
    itemName: { type: String, required: true },         // jese user ne likha
    brand: { type: String, default: "" },
    category: { type: String, default: "" },            // quick-order category: food|grocery|mart|pharmacy
    requestCount: { type: Number, default: 0 },
    lastRequestedAt: { type: Date, default: Date.now },
    reason: { type: String, enum: ["NOT_FOUND", "BRAND_NOT_AVAILABLE"], default: "NOT_FOUND" },
    status: { type: String, enum: ["PENDING", "ADDED", "IGNORED"], default: "PENDING" },
    addedProductId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", default: null },
    subscribers: [{
      _id: false,
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      requestedAt: { type: Date, default: Date.now },
      notifiedAt: { type: Date, default: null },        // null = abhi notification nahi gayi
    }],
  },
  { timestamps: true }
);
unmatchedProductSchema.index({ normalizedName: 1, category: 1 }, { unique: true });
unmatchedProductSchema.index({ status: 1, requestCount: -1 });

module.exports = mongoose.model("UnmatchedProduct", unmatchedProductSchema);