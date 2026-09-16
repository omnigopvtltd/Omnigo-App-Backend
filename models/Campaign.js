const mongoose = require("mongoose");

const campaignSchema = new mongoose.Schema(
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
    campaignName: {
      type: String,
      required: true,
      trim: true,
    },
    campaignType: {
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

    // Dynamic offer configuration
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

      // BOGO Specific
      buyQuantity: { type: Number, default: 1 },
      getQuantity: { type: Number, default: 1 },
      freeItemId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        default: null,
      },

      // Combo Specific
      comboName: { type: String, default: "" },
      comboItems: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
        },
      ],
      originalPrice: { type: Number, default: 0 },
      dealPrice: { type: Number, default: 0 },

      // Payment / Card Deal Specific
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

    // Applies On scoping
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

    // Schedule & Timing
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    startTime: { type: String, default: "00:00" }, // Format HH:mm (e.g. 18:00)
    endTime: { type: String, default: "23:59" },

    // Usage Rules & Limits
    minOrderAmount: { type: Number, default: 0 },
    maxDiscountAmount: { type: Number, default: 0 },
    usageLimit: { type: Number, default: null }, // Total redemption limit
    perCustomerLimit: { type: Number, default: 1 },
    eligibleCustomers: {
      type: String,
      enum: ["all", "new_customers", "existing_customers"],
      default: "all",
    },

    // Asset & Status
    campaignBanner: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
    isFavourite: { type: Boolean, default: true },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true },
);

// Mongoose validation for dates
campaignSchema.pre("validate", function (next) {
  if (this.endDate && this.startDate && this.endDate < this.startDate) {
    return next(new Error("endDate must be after or equal to startDate"));
  }
  next();
});

module.exports = mongoose.model("Campaign", campaignSchema);
