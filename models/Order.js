const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Rider Assignment
    riderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    isAssigned: {
      type: Boolean,
      default: false,
    },

    acceptedAt: {
      type: Date,
      default: null,
    },

    address: {
      // addressId: String,
      phone: String,
      address: String,
      city: String,
      zipCode: String,
      country: String,
    },

    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
        },

        name: String,
        image: String,
        category: String,
        weight: String,

        price: Number,
        quantity: Number,

        total: Number,
      },
    ],

    paymentMethod: {
      type: String,
      enum: ["cash_on_delivery", "card", "wallet"],
      default: "cash_on_delivery",
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },

    subtotal: Number,

    deliveryFee: {
      type: Number,
      default: 0,
    },

    tax: {
      type: Number,
      default: 0,
    },

    promoDiscount: {
      type: Number,
      default: 0,
    },

    totalAmount: Number,

    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "preparing",
        "ongoing",
        "delivered",
        "cancelled",
      ],
      default: "pending",
    },
    // NEW — Step 4: rider wallet-float order flow (Option 1)
    // Amount debited from the rider's wallet when they accepted this order
    // (a "float" covering the cash they'll collect on delivery). Refunded if
    // the order is cancelled after acceptance; returned + delivery fee on
    // successful delivery.
    riderFloatAmount: {
      type: Number,
      default: 0,
    },
    riderFloatSettled: {
      type: Boolean,
      default: false,
    },
    // NEW — Step 4: links this delivery to an active bonus-session
    // participation (Option 2), so completing it can count toward the
    // session's required-order count.
    sessionParticipationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RiderSessionParticipation",
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

orderSchema.pre("save", function (next) {
  if (!this.orderNumber) {
    this.orderNumber = "ORD" + Date.now() + Math.floor(Math.random() * 1000);
  }
});

module.exports = mongoose.model("Order", orderSchema);
