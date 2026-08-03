const mongoose = require("mongoose");

const SubCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String },
    image: { type: String, required: true },
    description: { type: String, default: "" },
    sortOrder: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["none", "popular", "signature", "special", "hot", "best", "active", "inactive"],
      default: "none",
    },
  },
  { timestamps: true }
);

const FoodCategoriesSchema = new mongoose.Schema(
  {
    categoryName: { type: String, required: true, trim: true },
    categorySlug: { type: String, unique: true },
    description: { type: String, default: "" },
    image: { type: String, default: "" },
    icon: { type: String, default: "" },
    subCategories: [SubCategorySchema],
    sortOrder: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["none", "popular", "signature", "special", "hot", "best", "active", "inactive"],
      default: "none",
    },
    isFeatured: { type: Boolean, default: false },
  },
  { timestamps: true }
);

FoodCategoriesSchema.pre("save", function () {
  if (this.isModified("categoryName") || !this.categorySlug) {
    this.categorySlug =
      this.categoryName
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") +
      "-" +
      Date.now().toString(36);
  }

  if (this.subCategories && this.subCategories.length > 0) {
    this.subCategories.forEach((sub) => {
      if (!sub.slug && sub.name) {
        sub.slug =
          sub.name
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "") +
          "-" +
          Date.now().toString(36);
      }
    });
  }
});

module.exports = mongoose.model("FoodCategories", FoodCategoriesSchema);