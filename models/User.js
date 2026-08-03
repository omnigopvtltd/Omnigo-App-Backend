// const mongoose = require("mongoose");

// const userSchema = new mongoose.Schema(
//   {
//     // BASIC INFO
//     name: { type: String, trim: true, default: null },

//     email: {
//       type: String,
//       unique: true,
//       sparse: true,
//       lowercase: true,
//       trim: true,
//       default: null,
//     },

//     password: { type: String, default: null },
//     fcmToken: {
//       type: String,
//       default: "",
//     },
//     phone: {
//       type: String,
//       unique: true,
//       sparse: true,
//       trim: true,
//       default: null,
//     },

//     cnicNumber: String,
//     profilePicture: String,

//     paymentMethod: {
//       type: String,
//       enum: ["cash", "jazzcash", "easypaisa", "bank"]
//     },

//     vehicleNumber: String,
//     drivingLicenseNumber: String,

//     vehicleCategory: {
//       type: String,
//       enum: ["bike", "car", "van"]
//     },

//     vehicleModel: String,
//     vehiclePicture: String,

//     isProfileCompleted: {
//       type: Boolean,
//       default: false
//     },

//     verificationSelfie: {
//       type: String,
//       default: null,
//     },

//     verificationStatus: {
//       type: String,
//       enum: ["not_submitted", "pending", "approved", "rejected"],
//       default: "not_submitted",
//     },

//     verificationReason: {
//       type: String,
//       default: null,
//     },

//     verifiedAt: {
//       type: Date,
//       default: null,
//     },

//     // SOCIAL LOGIN
//     googleId: { type: String, default: null },
//     facebookId: { type: String, default: null },

//     // VERIFICATION
//     isPhoneVerified: { type: Boolean, default: false },
//     isEmailVerified: { type: Boolean, default: true },

//     // ROLE
//     role: {
//       type: String,
//       enum: ["superadmin", "admin", "rider", "user"],
//       default: "user",
//     },
//     //Token for push notifications
//     fcmToken: { type: String, default: null },

//     // ===============================
//     // SERVICE ZONES (INSIDE USER)
//     // ===============================
//     serviceZones: [
//       {
//         zone: { type: String, trim: true },
//         areas: [{ type: String }],
//         isActive: { type: Boolean, default: true },
//       },
//     ],

//     // ===============================
//     // LOCATION
//     // ===============================
//     location: {
//       _id: {
//         type: mongoose.Schema.Types.ObjectId,
//         default: () => new mongoose.Types.ObjectId(),
//       },
//       mode: {
//         type: String,
//         enum: ["auto", "manual"],
//         default: null,
//       },

//       coordinates: {
//         lat: { type: Number, default: null },
//         lng: { type: Number, default: null },
//       },

//       zone: { type: String, default: null },
//       area: { type: String, default: null },
//       address: { type: String, default: null },

//       isEnabled: { type: Boolean, default: false },
//     },
//     addresses: [
//       {
//         phone: {
//           type: String,
//           trim: true,
//           required: true,
//         },

//         address: {
//           type: String,
//           trim: true,
//           required: true,
//         },

//         city: {
//           type: String,
//           trim: true,
//           required: true,
//         },

//         zipCode: {
//           type: String,
//           trim: true,
//           required: true,
//         },

//         country: {
//           type: String,
//           trim: true,
//           required: true,
//         },
//         isSave: {
//           type: Boolean,
//           default: false,
//         },
//         isDefault: {
//           type: Boolean,
//           default: false,
//         },
//       },
//     ],
//     // STATUS
//     isBlocked: { type: Boolean, default: false },
//     lastLogin: { type: Date, default: null },
//     lastPasswordChanged: { type: Date, default: null },

//     favorites: [
//       {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: "Product",
//       },
//     ],

//     //////////////////////////////////////////
//     // isBlocked: { type: Boolean, default: false },

//     wallet: {
//       balance: { type: Number, default: 0 },
//     },

//     riderProfile: {
//       vehicleType: {
//         type: String,
//         enum: ["bike", "car", "van"],
//         default: "bike",
//       },
//       vehiclePlate: { type: String, default: "" },
//       vehicleModel: { type: String, default: "" },
//       isOnline: { type: Boolean, default: false },
//       currentLocation: {
//         lat: Number,
//         lng: Number,
//         updatedAt: Date,
//       },
//       rating: {
//         average: { type: Number, default: 0 },
//         count: { type: Number, default: 0 },
//       },

//       cnicVerification: {
//         cnicNumber: { type: String, default: "" },
//         frontImage: { type: String, default: "" },
//         backImage: { type: String, default: "" },
//         status: {
//           type: String,
//           enum: ["not_submitted", "pending", "verified", "rejected"],
//           default: "not_submitted",
//         },
//         submittedAt: Date,
//         verifiedAt: Date,
//         verifiedBy: {
//           type: mongoose.Schema.Types.ObjectId,
//           ref: "User",
//           default: null,
//         },
//         rejectionReason: { type: String, default: "" },
//       },

//       faceVerification: {
//         image: { type: String, default: "" },
//         status: {
//           type: String,
//           enum: ["not_submitted", "pending", "verified", "rejected"],
//           default: "not_submitted",
//         },
//         submittedAt: Date,
//         verifiedAt: Date,
//         verifiedBy: {
//           type: mongoose.Schema.Types.ObjectId,
//           ref: "User",
//           default: null,
//         },
//         rejectionReason: { type: String, default: "" },
//       },
//     },
//   },
//   { timestamps: true },
// );

// module.exports = mongoose.model("User", userSchema);

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
      unique: true,
      sparse: true,
      trim: true,
      default: null,
    },

    cnicNumber: { type: String, default: "" },
    profilePicture: { type: String, default: "" },

    paymentMethod: {
      type: String,
      enum: ["cash", "jazzcash", "easypaisa", "bank"],
    },

    role: {
      type: String,
      enum: ["superadmin", "admin", "rider", "customer", "user"],
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
        phone: { type: String, required: true },
        address: { type: String, required: true },
        city: { type: String, required: true },
        zipCode: { type: String, required: true },
        country: { type: String, required: true },
        isDefault: { type: Boolean, default: false },
      },
    ],

    // RIDER PROFILE & LIVE TRACKING
    riderProfile: {
      vehicleType: {
        type: String,
        enum: ["bike", "car", "van"],
        default: "bike",
      },
      vehiclePlate: { type: String, default: "" },
      vehicleModel: { type: String, default: "" },
      isOnline: { type: Boolean, default: false },

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

      verificationStatus: {
        type: String,
        enum: ["not_submitted", "pending", "approved", "rejected"],
        default: "not_submitted",
      },

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
