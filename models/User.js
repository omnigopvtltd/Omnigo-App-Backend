const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, default: null, trim: true },

    email: {
      type: String,
      unique: true,
      sparse: true, // allow null emails safely
      lowercase: true,
      default: null,
    },

    password: { type: String, default: null },

    phone: {
      type: String,
      unique: true,
      sparse: true,
      default: null,
    },

    googleId: { type: String, default: null },
    facebookId: { type: String, default: null },

    isPhoneVerified: { type: Boolean, default: false },
    isEmailVerified: { type: Boolean, default: false },

    role: {
      type: String,
      enum: ["superadmin", "admin", "rider", "user"],
      default: "user",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);