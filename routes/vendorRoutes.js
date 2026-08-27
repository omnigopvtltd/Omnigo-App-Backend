// const express=require("express");
// const router=express.Router();

// const {
//      vendorLogin,
//  verifyVendorOtp,
//  createVendor,
//  getVendors,
//  getVendorById,
//  updateVendor,
//  updateVendorStatus,
//  deleteVendor
// }=require("../controllers/vendorController");

// const auth = require("../middleware/auth");

// router.post(
//     "/create",
//     auth,
//     createVendor
// );

// router.get(
//     "/",
//     auth,
//     getVendors
// );

// router.get(
//     "/:id",
//     auth,
//     getVendorById
// );

// router.put(
//     "/:id",
//     auth,
//     updateVendor
// );

// router.put(
//     "/:id/status",
//     auth,
//     updateVendorStatus
// );

// router.delete(
//     "/:id",
//     auth,
//     deleteVendor
// );

// router.post(
//  "/login",
//  vendorLogin
// );

// router.post(
//  "/verify-otp",
//  verifyVendorOtp
// );

// module.exports=router;

const express = require("express");
const router = express.Router();
const vendorController = require("../controllers/vendorController");

// Middleware to authenticate JWT token
// const { auth } = require("../middleware/auth");
const auth = require("../middleware/authMiddleware");
const {
  validateSignup,
  completeVendorProfile,
  resetPassword,
  forgotPassword,
  login,
  googleLogin,
  facebookLogin,
  sendOTP,
  verifyOTP,
  signup
} = require("../controllers/vendorController");
const { saveFcmToken } = require("../controllers/vendorController");

// ======================================================
// AUTHENTICATION & ACCOUNT CREATION
// ======================================================

// @route   POST /api/vendor/signup
// @desc    Register a new vendor account
// @access  Public
router.post("/signup", validateSignup, signup);

// @route   POST /api/vendor/login
// @desc    Login vendor with phone/email and password
// @access  Public
router.post("/login", login);

// @route   POST /api/vendor/google-login
// @desc    Authenticate/Register vendor using Google OAuth
// @access  Public
// router.post("/google-login", googleLogin);

// @route   POST /api/vendor/facebook-login
// @desc    Authenticate/Register vendor using Facebook OAuth
// @access  Public
// router.post("/facebook-login", facebookLogin);

// ======================================================
// VERIFICATION & OTP MANAGEMENT
// ======================================================

// @route   POST /api/vendor/send-otp
// @desc    Send OTP to phone or email for verification
// @access  Public
router.post("/send-otp", sendOTP);

// @route   POST /api/vendor/verify-otp
// @desc    Verify phone/email OTP
// @access  Public
router.post("/verify-otp", verifyOTP);

// ======================================================
// PASSWORD MANAGEMENT
// ======================================================

// @route   POST /api/vendor/forgot-password
// @desc    Request password reset OTP via email or phone
// @access  Public
router.post("/forgot-password", forgotPassword);

// @route   POST /api/vendor/reset-password
// @desc    Reset vendor password after OTP verification
// @access  Public
router.post("/reset-password", resetPassword);

// ======================================================
// PROTECTED VENDOR ROUTES
// ======================================================

// @route   POST /api/vendor/save-fcm-token
// @desc    Save/Update FCM notification token
// @access  Private (Vendor)
router.post("/save-fcm-token", auth, saveFcmToken);

// @route   PUT /api/vendor/complete-profile
// @desc    Complete KYC, business details, bank info, and default branch
// @access  Private (Vendor)
router.put("/complete-profile", auth, completeVendorProfile);

module.exports = router;
