// const mongoose = require("mongoose");

// const dealSchema = new mongoose.Schema(
//   {
//     title: { type: String, required: true },
//     description: { type: String },
//     image: { type: String, required: true },
//     bannerImage: { type: String, required: true },
//     vendorId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Vendor",
//       required: true,
//     },
//     items: [
//       {
//         productId: {
//           type: mongoose.Schema.Types.ObjectId,
//           ref: "Product",
//         },
//         name: String,
//         image: String,
//         category: String,
//         price: Number,
//         quantity: Number,
//         total: Number,
//       },
//     ],
//     originalPrice: { type: Number, required: true },
//     discountPrice: { type: Number, required: true },
//     dealType: { type: String, default: "Daily Deal" }, // Badge tag (e.g. 499/-)
//     tag: { type: String, default: "Today's Deal" }, // Badge tag (e.g. 499/-)
//     isActive: { type: Boolean, default: true },
//     isFeatured: { type: Boolean, default: false },
//     validFrom: { type: Date, default: Date.now },
//     validUntil: { type: Date },
//   },
//   { timestamps: true },
// );

// module.exports = mongoose.model("Deal", dealSchema);

const mongoose = require("mongoose");

const dealSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VendorBranch",
      default: null,
    },
    // Exact Campaign naming parity
    dealName: {
      type: String,
      required: true,
      trim: true,
    },
    dealType: {
      type: String,
      required: true,
      enum: [
        "flash_deal",
        "discount_deal",
        "bogo_deal",
        "combo_deal",
        "free_delivery",
        "payment_card_deal",
        "custom_deal",
      ],
    },
    description: {
      type: String,
      default: "",
    },

    // Dynamic offer details (Combines Menu Deals + Campaign Rules)
    offerDetails: {
      dealTitle: { type: String, default: "" },
      offerType: {
        type: String,
        enum: [
          "percentage_discount",
          "fixed_discount",
          "special_price",
          "buy_x_get_y",
          "free_item",
          "free_delivery",
          "payment_method_discount",
          "other",
        ],
      },
      discountType: {
        type: String,
        enum: ["percentage", "fixed_amount"],
      },
      discountValue: { type: Number, default: 0 },

      // Flexible Combo Items (Quantity support included for Menu Deals)
      comboName: { type: String, default: "" },
      itemsIncluded: [
        {
          product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
          },
          customItemName: { type: String, default: "" }, // E.g. "Crown Large Pizza" or "1.5 Ltr Drink"
          quantity: { type: Number, default: 1 },
        },
      ],

      // Legacy support for campaign combo array
      comboItems: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
        },
      ],

      originalPrice: { type: Number, default: 0 },
      dealPrice: { type: Number, default: 0 },

      // BOGO Details
      buyQuantity: { type: Number, default: 1 },
      getQuantity: { type: Number, default: 1 },
      freeItemId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        default: null,
      },

      // Payment Details
      paymentMethod: {
        type: String,
        enum: [
          "easypaisa",
          "jazzcash",
          "bank_card",
          "credit_card",
          "debit_card",
          "custom",
        ],
      },
      maxDeliveryDiscount: { type: Number, default: 0 },
    },

    // Applies On Scoping
    appliesTo: {
      type: String,
      enum: ["all_items", "category", "specific_items"],
      default: "all_items",
    },
    applicableCategories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
      },
    ],
    applicableProducts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],

    // Schedule & Timing (Matches Campaign Schema)
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    startTime: { type: String, default: "00:00" },
    endTime: { type: String, default: "23:59" },

    // Usage Rules & Limits
    minOrderAmount: { type: Number, default: 0 },
    maxDiscountAmount: { type: Number, default: 0 },
    usageLimit: { type: Number, default: null },
    perCustomerLimit: { type: Number, default: 1 },
    eligibleCustomers: {
      type: String,
      enum: ["all", "new_customers", "existing_customers"],
      default: "all",
    },

    // Asset & Status
    dealBanner: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
    isFavourite: { type: Boolean, default: true },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

dealSchema.pre("validate", function (next) {
  if (this.endDate && this.startDate && this.endDate < this.startDate) {
    return next(new Error("endDate must be after or equal to startDate"));
  }
  next();
});

module.exports = mongoose.model("Deal", dealSchema);