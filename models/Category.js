// const mongoose = require("mongoose");

// const categorySchema = new mongoose.Schema(
//   {
//     name: {
//       type: String,
//       required: true,
//       trim: true,
//       unique: true,
//     },

//     image: {
//       type: String,
//       default: "",
//     },

//     status: {
//       type: String,
//       enum: [
//         "Most Popular",
//         "Trending",
//         "50% OFF",
//         "New Arrival",
//         "Recommended",
//         "Best Seller",
//         "Limited Time",
//         "Hot Deal"
//       ],
//       default: "Most Popular",
//     },
//   },
//   {
//     timestamps: true,
//   }
// );

// module.exports = mongoose.model("Category", categorySchema);

const mongoose = require("mongoose");

const SubCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String },
    image: { type: String, required: true },
    icon: { type: String, default: "" },
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

const categorySchema = new mongoose.Schema(
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

categorySchema.pre("save", function () {
  if (this.isModified("categoryName") || !this.categorySlug) {
    this.categorySlug =
      this.categoryName
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
  }

  if (this.subCategories && this.subCategories.length > 0) {
    this.subCategories.forEach((sub) => {
      if (!sub.slug && sub.name) {
        sub.slug =
          sub.name
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "");
      }
    });
  }
});

module.exports = mongoose.model("Category", categorySchema);