const mongoose = require("mongoose");

const vendorBranchSchema = new mongoose.Schema(
  {
    // =====================================================
    // VENDOR
    // =====================================================

    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
      index: true,
    },

    // =====================================================
    // BRANCH INFORMATION
    // =====================================================

    branchName: {
      type: String,
      required: true,
      trim: true,
    },

    // branchCode: {
    //   type: String,
    //   unique: true,
    //   sparse: true,
    //   trim: true,
    // },

    // =====================================================
    // BRANCH CONTACT
    // =====================================================

    phone: {
      type: String,
      default: "",
      trim: true,
    },

    email: {
      type: String,
      default: "",
      lowercase: true,
      trim: true,
    },

    // =====================================================
    // BRANCH ADDRESS
    // =====================================================

    address: {
      type: String,
      required: true,
      trim: true,
    },

    area: {
      type: String,
      default: "",
      trim: true,
    },

    city: {
      type: String,
      required: true,
      trim: true,
    },

    zipCode: {
      type: String,
      default: "",
      trim: true,
    },

    country: {
      type: String,
      default: "Pakistan",
      trim: true,
    },

    // =====================================================
    // GEO LOCATION
    // =====================================================

    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },

      coordinates: {
        type: [Number],
        default: [0, 0],
        // [longitude, latitude]
      },
    },

    // =====================================================
    // OPENING HOURS
    // =====================================================

    openingHours: {
      monday: {
        isOpen: {
          type: Boolean,
          default: true,
        },
        open: {
          type: String,
          default: "10:00",
        },
        close: {
          type: String,
          default: "23:00",
        },
      },

      tuesday: {
        isOpen: {
          type: Boolean,
          default: true,
        },
        open: {
          type: String,
          default: "10:00",
        },
        close: {
          type: String,
          default: "23:00",
        },
      },

      wednesday: {
        isOpen: {
          type: Boolean,
          default: true,
        },
        open: {
          type: String,
          default: "10:00",
        },
        close: {
          type: String,
          default: "23:00",
        },
      },

      thursday: {
        isOpen: {
          type: Boolean,
          default: true,
        },
        open: {
          type: String,
          default: "10:00",
        },
        close: {
          type: String,
          default: "23:00",
        },
      },

      friday: {
        isOpen: {
          type: Boolean,
          default: true,
        },
        open: {
          type: String,
          default: "10:00",
        },
        close: {
          type: String,
          default: "23:00",
        },
      },

      saturday: {
        isOpen: {
          type: Boolean,
          default: true,
        },
        open: {
          type: String,
          default: "10:00",
        },
        close: {
          type: String,
          default: "23:00",
        },
      },

      sunday: {
        isOpen: {
          type: Boolean,
          default: true,
        },
        open: {
          type: String,
          default: "10:00",
        },
        close: {
          type: String,
          default: "23:00",
        },
      },
    },

    // =====================================================
    // DELIVERY / PICKUP
    // =====================================================

    // deliveryAvailable: {
    //   type: Boolean,
    //   default: true,
    // },

    // pickupAvailable: {
    //   type: Boolean,
    //   default: true,
    // },

    // minimumOrderAmount: {
    //   type: Number,
    //   default: 0,
    // },

    // estimatedPreparationTime: {
    //   type: Number,
    //   default: 30,
    //   // minutes
    // },

    // deliveryRadius: {
    //   type: Number,
    //   default: 10,
    //   // kilometers
    // },

    // =====================================================
    // BRANCH STATUS
    // =====================================================

    isActive: {
      type: Boolean,
      default: true,
    },

    isOpen: {
      type: Boolean,
      default: false,
    },

    isRushMode: {
      type: Boolean,
      default: false,
    },
    isSponsored: { type: Boolean, default: false },
    isFreeDelivery: { type: Boolean, default: true },
    commissionRate: { type: Number, default: 15 }, // %
    wallet: {
      balance: { type: Number, default: 0 },
    },

  },
  {
    timestamps: true,
  },
);

// =====================================================
// GEO-SPATIAL INDEX
// =====================================================

vendorBranchSchema.index({
  location: "2dsphere",
});

// =====================================================
// VENDOR + ACTIVE BRANCH INDEX
// =====================================================

vendorBranchSchema.index({
  vendorId: 1,
  isActive: 1,
});

module.exports = mongoose.model("VendorBranch", vendorBranchSchema);
