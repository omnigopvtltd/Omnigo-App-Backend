require("dotenv").config();
const User = require("../models/User");
const OTP = require("../models/OTP");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const axios = require("axios");
const { OAuth2Client } = require("google-auth-library");
const { body } = require("express-validator");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ================= TOKEN =================
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

// ================= CLEAN RESPONSE (FINAL FIX) =================
const sendResponse = (res, message, user) => {
  const token = generateToken(user);

  const responseUser = {
    id: user._id,
    role: user.role,
    phone: user.phone,
    isPhoneVerified: user.isPhoneVerified || false,
    isEmailVerified: user.isEmailVerified || false,
  };

  // only include if exists
  if (user.name) responseUser.name = user.name;
  if (user.email) responseUser.email = user.email;

  return res.json({
    message,
    token,
    user: responseUser,
  });
};

// ================= OTP GENERATOR =================
const generateOtp = () =>
  Math.floor(100000 + Math.random() * 900000).toString();


// =====================================================
// ================= SEND OTP ===========================
// =====================================================
exports.sendOTP = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ message: "Phone is required" });
    }

    const otp = generateOtp();

    await OTP.findOneAndUpdate(
      { phone },
      {
        phone,
        otp,
        expiresAt: Date.now() + 5 * 60 * 1000,
        verified: false,
      },
      { upsert: true, new: true }
    );

    console.log("OTP:", otp);

    return res.json({
      message: "OTP sent successfully",
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// =====================================================
// ================= VERIFY OTP ========================
// =====================================================
exports.verifyOTP = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    const record = await OTP.findOne({ phone });

    if (!record) {
      return res.status(400).json({ message: "OTP not found" });
    }

    if (record.expiresAt < Date.now()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    if (record.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    record.verified = true;
    await record.save();

    let user = await User.findOne({ phone });

    if (!user) {
      user = await User.create({
        phone,
        role: "user",
        isPhoneVerified: true,
      });
    } else {
      user.isPhoneVerified = true;
      await user.save();
    }

    return sendResponse(res, "Phone verified successfully", user);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// =====================================================
// ================= SIGNUP ============================
// =====================================================
exports.signup = [
  body("name").notEmpty(),
  body("email").isEmail(),
  body("password").isLength({ min: 6 }),

  async (req, res) => {
    try {
      const { name, email, password } = req.body;

      const existing = await User.findOne({ email });

      if (existing) {
        return res.status(400).json({ message: "Email already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      const user = await User.create({
        name,
        email,
        password: hashedPassword,
        role: "user",
        isEmailVerified: true,
      });

      return sendResponse(res, "Signup successful", user);

    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
];


// =====================================================
// ================= LOGIN =============================
// =====================================================
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user || !user.password) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    return sendResponse(res, "Login successful", user);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// =====================================================
// ================= GOOGLE LOGIN ======================
// =====================================================
exports.googleLogin = async (req, res) => {
  try {
    const { idToken } = req.body;

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const { name, email, sub } = ticket.getPayload();

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        name,
        email,
        googleId: sub,
        role: "user",
        isEmailVerified: true,
      });
    }

    return sendResponse(res, "Google login successful", user);

  } catch (err) {
    res.status(401).json({ message: "Invalid Google Token" });
  }
};


// =====================================================
// ================= FACEBOOK LOGIN ====================
// =====================================================
exports.facebookLogin = async (req, res) => {
  try {
    const { accessToken } = req.body;

    const response = await axios.get(
      `https://graph.facebook.com/me?fields=id,name,email&access_token=${accessToken}`
    );

    const { id, name, email } = response.data;

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        name,
        email,
        facebookId: id,
        role: "user",
        isEmailVerified: true,
      });
    }

    return sendResponse(res, "Facebook login successful", user);

  } catch (err) {
    res.status(401).json({ message: "Invalid Facebook Token" });
  }
};


// =====================================================
// ================= CREATE ADMIN ======================
// =====================================================
exports.createAdmin = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existing = await User.findOne({ email });

    if (existing) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const hashed = await bcrypt.hash(password, 12);

    const admin = await User.create({
      name,
      email,
      password: hashed,
      role: "admin",
      isEmailVerified: true,
    });

    return sendResponse(res, "Admin created successfully", admin);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// =====================================================
// ================= CREATE RIDER ======================
// =====================================================
exports.createRider = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    const existing = await User.findOne({
      $or: [{ email }, { phone }],
    });

    if (existing) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashed = await bcrypt.hash(password, 12);

    const rider = await User.create({
      name,
      email,
      phone,
      password: hashed,
      role: "rider",
      isEmailVerified: true,
    });

    return sendResponse(res, "Rider created successfully", rider);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};