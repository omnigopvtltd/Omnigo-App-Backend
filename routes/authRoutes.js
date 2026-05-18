const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/rolemiddleware");

const {
  signup,
  login,
  googleLogin,
  facebookLogin,
  sendOTP,
  verifyOTP,
  createAdmin,
  createRider,
} = require("../controllers/authController");


// ================= AUTH =================

// Email Auth
router.post("/signup", signup);
router.post("/login", login);

// Social Auth
router.post("/google-login", googleLogin);
router.post("/facebook-login", facebookLogin);

// Phone OTP Auth
router.post("/send-otp", sendOTP); 
router.post("/verify-otp", verifyOTP);


// ================= ADMIN =================

// Create Admin (only superadmin)
router.post("/admin", auth, authorizeRoles("superadmin"), createAdmin);

// Create Rider (admin only)
router.post("/rider", auth, authorizeRoles("admin"), createRider);


module.exports = router;