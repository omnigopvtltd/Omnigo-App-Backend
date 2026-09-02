const express = require("express");
const router = express.Router();

// Middleware to authenticate JWT token
const auth = require("../middleware/authMiddleware");
const {
  validateSignup,
  resetPassword,
  forgotPassword,
  login,
  googleLogin,
  facebookLogin,
  sendOTP,
  verifyOTP,
  signup,
  updateVendorProfile,
} = require("../controllers/vendorController");
const { saveFcmToken } = require("../controllers/vendorController");
const upload = require("../middleware/upload");

// ======================================================
// AUTHENTICATION & ACCOUNT CREATION
// ======================================================

router.post(
  "/signup",
  upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
    { name: "profilePicture", maxCount: 1 },
    { name: "cnicFrontPicture", maxCount: 1 },
    { name: "cnicBackPicture", maxCount: 1 },
    { name: "incorporationCertificate", maxCount: 1 },
    { name: "foodSafetyLicense", maxCount: 1 },
    { name: "ntnCertificate", maxCount: 1 },
  ]),
  validateSignup,
  signup,
);
router.post("/login", login);

// router.post("/google-login", googleLogin);
// router.post("/facebook-login", facebookLogin);

// ======================================================
// VERIFICATION & OTP MANAGEMENT
// ======================================================

router.post("/send-otp", sendOTP);
router.post("/verify-otp", verifyOTP);

// ======================================================
// PASSWORD MANAGEMENT
// ======================================================

router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

// ======================================================
// PROTECTED VENDOR ROUTES
// ======================================================

router.post("/save-fcm-token", auth, saveFcmToken);
router.put(
  "/complete-profile",
  upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
    { name: "profilePicture", maxCount: 1 },
    { name: "cnicFrontPicture", maxCount: 1 },
    { name: "cnicBackPicture", maxCount: 1 },
    { name: "incorporationCertificate", maxCount: 1 },
    { name: "foodSafetyLicense", maxCount: 1 },
    { name: "ntnCertificate", maxCount: 1 },
  ]),
  auth,
  updateVendorProfile,
);

module.exports = router;
