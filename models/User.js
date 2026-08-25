const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    // BASIC INFO
    name: { type: String, trim: true, default: null },

    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      default: null,
    },

    password: { type: String, default: null },
    fcmToken: { type: String, default: "" },
    phone: {
      type: String,
      sparse: true,
      trim: true,
      default: null,
    },

    cnicNumber: { type: String, default: "" },
    profilePicture: { type: String, default: "" },

    paymentMethod: {
      type: String,
      enum: ["cash", "jazzcash", "easypaisa", "bank"],
      default: "cash",
    },

    role: {
      type: String,
      enum: ["superadmin", "admin", "vendor", "rider", "customer", "user"],
      default: "customer",
    },

    // SOCIAL LOGIN
    googleId: { type: String, default: null },
    facebookId: { type: String, default: null },

    // VERIFICATION
    isPhoneVerified: { type: Boolean, default: false },
    isEmailVerified: { type: Boolean, default: true },
    isBlocked: { type: Boolean, default: false },
    lastLogin: { type: Date, default: null },

    // WALLET
    wallet: {
      balance: { type: Number, default: 0 },
    },

    // ADDRESSES
    addresses: [
      {
        address: { type: String, required: true },
        city: { type: String, required: true },
        zipCode: { type: String, required: true },
        country: { type: String, required: true },
        isDefault: { type: Boolean, default: false },
      },
    ],

    // RIDER PROFILE & LIVE TRACKING
    riderProfile: {
      categories: {
        type: [
          {
            name: { type: String, required: true },
            isActive: { type: Boolean, default: false },
          },
        ],
        default: [
          { name: "Delivery Rider", isActive: true },
          { name: "Bike Rider", isActive: false },
          { name: "Scooty Rider", isActive: false },
          { name: "Auto Rider", isActive: false },
          { name: "Car Rider", isActive: false },
          { name: "Van Rider", isActive: false },
        ],
      },

      bikeLoan: {
        hasActiveLoan: { type: Boolean, default: false },
        totalAmount: { type: Number, default: 0 }, // Total loan e.g. 150,000
        remainingAmount: { type: Number, default: 0 }, // Remaining e.g. 120,000
        dailyInstallment: { type: Number, default: 500 }, // Daily deduction amount
        startDate: { type: Date },
      },

      vehicleType: {
        type: String,
        enum: ["bike", "car", "van", "scooty", "auto", "delivery_rider"],
        default: "delivery_rider",
      },

      vehiclePlate: { type: String, default: "" },
      vehicleModel: { type: String, default: "" },

      // Verification
      verificationSelfie: {
        type: String,
        default: null,
      },

      verificationStatus: {
        type: String,
        enum: ["not_submitted", "pending", "approved", "rejected"],
        default: "not_submitted",
      },

      verificationReason: {
        type: String,
        default: null,
      },

      verifiedAt: {
        type: Date,
        default: null,
      },
      isOnline: { type: Boolean, default: false },
      isBusy: { type: Boolean, default: false },

      // Standard GeoJSON for MongoDB 2dsphere proximity queries
      location: {
        type: {
          type: String,
          enum: ["Point"],
          default: "Point",
        },
        coordinates: {
          type: [Number], // [longitude, latitude]
          default: [0, 0],
        },
        heading: { type: Number, default: 0 }, // Useful for map rotation
        updatedAt: { type: Date, default: Date.now },
      },

      rating: {
        average: { type: Number, default: 0 },
        count: { type: Number, default: 0 },
      },

      riderCanceledOrder: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Order",
        },
      ],

      autoAcceptOrders: {
        type: Boolean,
        default: false,
      },
    },
  },
  { timestamps: true },
);

// GeoSpatial Index for finding nearest online riders
userSchema.index({ "riderProfile.location": "2dsphere" });
userSchema.index({ role: 1, "riderProfile.isOnline": 1 });

module.exports = mongoose.model("User", userSchema);
