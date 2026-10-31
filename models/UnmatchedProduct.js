// models/UnmatchedProduct.js
// Wo items jo users ne maange magar hamare catalog mein nahi mile. Admin isse dekh kar naye products add karega.
const mongoose = require("mongoose");

const unmatchedProductSchema = new mongoose.Schema(
  {
    normalizedName: { type: String, required: true },   // "shan biryani masala"
    itemName: { type: String, required: true },         // jese user ne likha
    brand: { type: String, default: "" },
    category: { type: String, default: "" },
    requestCount: { type: Number, default: 1 },         // kitni baar maanga gaya (demand ka andaza)
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    lastRequestedAt: { type: Date, default: Date.now },
    reason: { type: String, enum: ["NOT_FOUND", "BRAND_NOT_AVAILABLE"], default: "NOT_FOUND" },
    suggestedInstead: { type: String, default: "" },    // humne kya dikhaya tha
    status: { type: String, enum: ["PENDING", "ADDED", "IGNORED"], default: "PENDING" },
  },
  { timestamps: true }
);

// Ek hi item baar baar duplicate na bane
unmatchedProductSchema.index({ normalizedName: 1, category: 1 }, { unique: true });
unmatchedProductSchema.index({ status: 1, requestCount: -1 });

module.exports = mongoose.model("UnmatchedProduct", unmatchedProductSchema);