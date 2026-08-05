const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const vendorSchema = new mongoose.Schema(
  {
    // =========================
    // Basic Info
    // =========================

    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
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
    },


    profilePicture: {
      type: String,
      default: "",
    },


    fcmToken: {
      type: String,
      default: "",
    },


    role: {
      type: String,
      default: "vendor",
    },


    // =========================
    // Vendor Profile
    // =========================

    vendorProfile: {

      shopName: {
        type: String,
        default: "",
      },


      shopAddress: {
        type: String,
        default: "",
      },


      category: {
        type: String,
        default: "",
      },


      isActive: {
        type: Boolean,
        default: true,
      },

    },


    // =========================
    // OTP Login
    // =========================

    otp: {
      type: String,
      default: null,
    },


    otpExpire: {
      type: Date,
      default: null,
    },


    // =========================
    // Verification
    // =========================

    isPhoneVerified: {
      type: Boolean,
      default: false,
    },


    isEmailVerified: {
      type: Boolean,
      default: true,
    },


    // =========================
    // Account Status
    // =========================

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



// =========================
// Password Hash Before Save
// =========================

vendorSchema.pre("save", async function(next){

  if(!this.isModified("password")){
    return next();
  }


  const salt = await bcrypt.genSalt(10);


  this.password = await bcrypt.hash(
    this.password,
    salt
  );


  next();

});



// =========================
// Compare Password Method
// =========================

vendorSchema.methods.comparePassword = async function(password){

  return await bcrypt.compare(
    password,
    this.password
  );

};



module.exports = mongoose.model(
  "Vendor",
  vendorSchema
);