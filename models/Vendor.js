const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const vendorSchema = new mongoose.Schema(
  {
    // =====================================================
    // ACCOUNT / SIGNUP INFORMATION
    // =====================================================

    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
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

    phone: {
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
      default: "",
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

    vendorProfile: {
      // ---------------------------------------------
      // Business Information
      // ---------------------------------------------

      businessName: {
        type: String,
        default: "",
        trim: true,
      },

      businessType: {
        type: String,
        enum: [
          "restaurant",
          "bakery",
          "home_chef",
          "grocery",
          "pharmacy",
          "other",
        ],
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

      businessEmail: {
        type: String,
        default: "",
        lowercase: true,
        trim: true,
      },

      businessPhone: {
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
          "completed"
        ],
        default: "",
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

      businessRegistrationDocument: {
        type: String,
        default: "",
      },

      foodLicenseDocument: {
        type: String,
        default: "",
      },

      taxDocument: {
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
        enum: [
          "draft",
          "pending_review",
          "approved",
          "rejected",
          "suspended",
        ],
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
        default: false,
      },
    },

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

    isEmailVerified: {
      type: Boolean,
      default: false,
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
  }
);

module.exports = mongoose.model("Vendor", vendorSchema);