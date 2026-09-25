const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const vendorSchema = new mongoose.Schema(
  {
    // =====================================================
    // ACCOUNT / SIGNUP INFORMATION
    // =====================================================

    businessName: {
      type: String,
      required: true,
      trim: true,
    },

    businessDescription: {
      type: String,
      trim: true,
    },

    businessEmail: {
      type: String,
      // required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
    },

    businessPhone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    role: {
      type: String,
      enum: ["vendor"],
      default: "vendor",
    },

    fcmToken: {
      type: String,
      default: "",
    },

    // =====================================================
    // OWNER INFORMATION
    // =====================================================

    ownerName: {
      type: String,
      default: "",
      trim: true,
    },

    ownerPhone: {
      type: String,
      default: "",
      trim: true,
    },

    ownerEmail: {
      type: String,
      default: "",
      lowercase: true,
      trim: true,
    },

    cnicNumber: {
      type: String,
      required: true,
      trim: true,
    },

    profilePicture: {
      type: String,
      default: "",
    },

    cnicFrontPicture: {
      type: String,
      default: "",
    },

    cnicBackPicture: {
      type: String,
      default: "",
    },

    // =====================================================
    // SOCIAL LOGIN
    // =====================================================

    googleId: {
      type: String,
      default: null,
    },

    facebookId: {
      type: String,
      default: null,
    },

    // =====================================================
    // VENDOR / BUSINESS PROFILE
    // =====================================================

    // vendorProfile: {
    // ---------------------------------------------
    // Business Information
    // ---------------------------------------------

    businessType: {
      type: String,
      // enum: [
      //   "restaurant",
      //   "bakery",
      //   "home_chef",
      //   "grocery",
      //   "pharmacy",
      //   "cafe",
      //   "other",
      // ],
      required: true,
      default: "restaurant",
    },

    category: {
      type: String,
      default: "",
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    logo: {
      type: String,
      default: "",
    },

    coverImage: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: [
        "pending",
        "assigned",
        "preparing",
        "ready",
        "completed",
        "cancelled",
      ],
      default: "pending",
    },

    // ---------------------------------------------
    // Business Verification
    // ---------------------------------------------

    businessRegistrationNumber: {
      type: String,
      default: "",
    },

    taxNumber: {
      type: String,
      default: "",
    },

    foodLicenseNumber: {
      type: String,
      default: "",
    },

    incorporationCertificate: {
      type: String,
      default: "",
    },

    foodSafetyLicense: {
      type: String,
      default: "",
    },

    ntnCertificate: {
      type: String,
      default: "",
    },

    otherDocuments: [
      {
        name: {
          type: String,
          default: "",
        },

        file: {
          type: String,
          default: "",
        },
      },
    ],

    // ---------------------------------------------
    // Verification
    // ---------------------------------------------

    verificationStatus: {
      type: String,
      enum: ["draft", "pending", "approved", "rejected", "suspended"],
      default: "draft",
    },

    rejectionReason: {
      type: String,
      default: "",
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    reviewedAt: {
      type: Date,
      default: null,
    },

    // ---------------------------------------------
    // Business Status
    // ---------------------------------------------

    isActive: {
      type: Boolean,
      default: true,
    },

    package: {
      type: String,
      enum: ["basic", "premium", "featured", ""],
      default: "",
    },
    // },

    // =====================================================
    // PAYMENT / PAYOUT INFORMATION
    // =====================================================

    payout: {
      accountHolderName: {
        type: String,
        default: "",
      },

      paymentMethod: {
        type: String,
        enum: ["bank", "jazzcash", "easypaisa", ""],
        default: "",
      },

      bankName: {
        type: String,
        default: "",
      },

      accountNumber: {
        type: String,
        default: "",
      },

      iban: {
        type: String,
        default: "",
      },

      walletNumber: {
        type: String,
        default: "",
      },

      isVerified: {
        type: Boolean,
        default: false,
      },
    },

    // =====================================================
    // OTP
    // =====================================================

    otp: {
      type: String,
      default: null,
    },

    otpExpire: {
      type: Date,
      default: null,
    },

    // =====================================================
    // VERIFICATION
    // =====================================================

    isPhoneVerified: {
      type: Boolean,
      default: false,
    },

    isSponsored: {
      type: Boolean,
      default: false,
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    rating: {
      average: { type: Number, default: 0 },
      count: { type: Number, default: 0 },
    },

    // =====================================================
    // ACCOUNT STATUS
    // =====================================================

    isBlocked: {
      type: Boolean,
      default: false,
    },

    lastLogin: {
      type: Date,
      default: null,
    },
  },

  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Vendor", vendorSchema);
