const mongoose = require("mongoose");

const dealSchema = new mongoose.Schema(
  {
    title: { type: String, required: true }, 
    description: { type: String },
    image: { type: String, required: true },
    bannerImage: { type: String, required: true },
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
    },
    originalPrice: { type: Number, required: true },
    discountPrice: { type: Number, required: true },
    dealType: { type: String, default: "Daily Deal" }, // Badge tag (e.g. 499/-)
    tag: { type: String, default: "Today's Deal" }, // Badge tag (e.g. 499/-)
    isActive: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false }, 
    validFrom: { type: Date, default: Date.now },
    validUntil: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Deal", dealSchema);