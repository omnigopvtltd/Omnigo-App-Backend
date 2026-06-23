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

    phone: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      default: null,
    },

    // SOCIAL LOGIN
    googleId: { type: String, default: null },
    facebookId: { type: String, default: null },

    // VERIFICATION
    isPhoneVerified: { type: Boolean, default: false },
    isEmailVerified: { type: Boolean, default: true },

    // ROLE
    role: {
      type: String,
      enum: ["superadmin", "admin", "rider", "user"],
      default: "user",
    },

    // ===============================
    // SERVICE ZONES (INSIDE USER)
    // ===============================
    serviceZones: [
      {
        zone: { type: String, trim: true },
        areas: [{ type: String }],
        isActive: { type: Boolean, default: true },
      },
    ],

    // ===============================
    // LOCATION
    // ===============================
    location: {
      _id: {
        type: mongoose.Schema.Types.ObjectId,
        default: () => new mongoose.Types.ObjectId(),
      },
      mode: {
        type: String,
        enum: ["auto", "manual"],
        default: null,
      },

      coordinates: {
        lat: { type: Number, default: null },
        lng: { type: Number, default: null },
      },

      zone: { type: String, default: null },
      area: { type: String, default: null },
      address: { type: String, default: null },

      isEnabled: { type: Boolean, default: false },
    },
    addresses: [
      {
        phone: {
          type: String,
          trim: true,
          required: true,
        },

        address: {
          type: String,
          trim: true,
          required: true,
        },

        city: {
          type: String,
          trim: true,
          required: true,
        },

        zipCode: {
          type: String,
          trim: true,
          required: true,
        },

        country: {
          type: String,
          trim: true,
          required: true,
        },
        isSave: {
          type: Boolean,
          default: false,
        },
        isDefault: {
          type: Boolean,
          default: false,
        },
      },
    ],
    // STATUS
    isBlocked: { type: Boolean, default: false },
    lastLogin: { type: Date, default: null },
    lastPasswordChanged: { type: Date, default: null },

    favorites: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);