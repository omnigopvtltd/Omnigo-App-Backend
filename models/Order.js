// const mongoose = require("mongoose");

// const orderSchema = new mongoose.Schema(
//   {
//     orderNumber: {
//       type: String,
//       unique: true,
//     },

//     userId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       required: true,
//     },

//     // Rider Assignment
//     riderId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       default: null,
//     },

//     isAssigned: {
//       type: Boolean,
//       default: false,
//     },

//     acceptedAt: {
//       type: Date,
//       default: null,
//     },

//     address: {
//       // addressId: String,
//       phone: String,
//       address: String,
//       city: String,
//       zipCode: String,
//       country: String,
//     },

//     instructions: {
//       type: String,
//       default: "",
//     },

    
    
//     items: [
//       {
//         orderFrom: {
//           type: String,
//           enum: ["fast-food", "grocery", "pharmacy", "other"],
//           default: "fast-food",
//         },
//         productId: {
//           type: mongoose.Schema.Types.ObjectId,
//           ref: "Product",
//         },

//         name: String,
//         image: String,
//         category: String,
//         weight: String,

//         price: Number,
//         quantity: Number,

//         total: Number,
//       },
//     ],

//     paymentMethod: {
//       type: String,
//       enum: ["cash_on_delivery", "card", "wallet"],
//       default: "cash_on_delivery",
//     },

//     paymentStatus: {
//       type: String,
//       enum: ["pending", "paid", "failed"],
//       default: "pending",
//     },

//     subtotal: Number,

//     deliveryFee: {
//       type: Number,
//       default: 0,
//     },

//     tax: {
//       type: Number,
//       default: 0,
//     },

//     promoDiscount: {
//       type: Number,
//       default: 0,
//     },

//     totalAmount: Number,

//     status: {
//       type: String,
//       enum: [
//         "pending",
//         "confirmed",
//         "preparing",
//         "ongoing",
//         "delivered",
//         "cancelled",
//       ],
//       default: "pending",
//     },
//     // NEW — Step 4: rider wallet-float order flow (Option 1)
//     // Amount debited from the rider's wallet when they accepted this order
//     // (a "float" covering the cash they'll collect on delivery). Refunded if
//     // the order is cancelled after acceptance; returned + delivery fee on
//     // successful delivery.
//     riderFloatAmount: {
//       type: Number,
//       default: 0,
//     },
//     riderFloatSettled: {
//       type: Boolean,
//       default: false,
//     },
//     // NEW — Step 4: links this delivery to an active bonus-session
//     // participation (Option 2), so completing it can count toward the
//     // session's required-order count.
//     sessionParticipationId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "RiderSessionParticipation",
//       default: null,
//     },
//   },
//   {
//     timestamps: true,
//   },
// );

// orderSchema.pre("save", function (next) {
//   if (!this.orderNumber) {
//     this.orderNumber = "ORD" + Date.now() + Math.floor(Math.random() * 1000);
//   }
//   next();
// });

// module.exports = mongoose.model("Order", orderSchema);


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
      phone: String,
      address: String,
      city: String,
      zipCode: String,
      country: String,
      // GeoJSON Location for Customer Drop-off Tracking
      location: {
        type: { type: String, enum: ["Point"], default: "Point" },
        coordinates: { type: [Number], default: [0, 0] }, // [longitude, latitude]
      },
    },

    instructions: {
      type: String,
      default: "",
    },

    // Vendor Pick-up Stops (Omnigo Mart, Restaurants, Bakeries, Pharmacies)
    stops: [
      {
        stopNumber: { type: Number, default: 1 },
        vendorId: { type: mongoose.Schema.Types.ObjectId, ref: "Restaurant" },
        vendorName: { type: String, default: "" },
        vendorType: {
          type: String,
          enum: ["fast-food", "grocery", "pharmacy", "bakery", "other"],
          default: "fast-food",
        },
        address: { type: String, default: "" },
        location: {
          type: { type: String, enum: ["Point"], default: "Point" },
          coordinates: { type: [Number], default: [0, 0] }, // [longitude, latitude]
        },
        status: {
          type: String,
          enum: ["assigned", "arrived_at_vendor", "picked_up"],
          default: "assigned",
        },
      },
    ],

    items: [
      {
        orderFrom: {
          type: String,
          enum: ["fast-food", "grocery", "pharmacy", "bakery", "other"],
          default: "fast-food",
        },
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

    // Live Navigation & Route Geometry (For OSRM / Mapbox Flutter Polylines)
    routingMetrics: {
      totalDistanceKm: { type: Number, default: 0 },
      totalEtaMin: { type: Number, default: 0 },
      routeGeometry: { type: Object, default: {} }, // GeoJSON line string
    },

    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "preparing",
        "arrived_at_vendor",
        "picked_up",
        "ongoing",
        "delivered",
        "cancelled",
      ],
      default: "pending",
    },

    // Float & Session Tracking
    riderFloatAmount: {
      type: Number,
      default: 0,
    },
    riderFloatSettled: {
      type: Boolean,
      default: false,
    },
    sessionParticipationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RiderSessionParticipation",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

orderSchema.pre("save", function (next) {
  if (!this.orderNumber) {
    this.orderNumber = "ORD" + Date.now() + Math.floor(Math.random() * 1000);
  }
  next();
});

module.exports = mongoose.model("Order", orderSchema);