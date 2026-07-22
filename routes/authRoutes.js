const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/rolemiddleware");

const {
  signup,
  login,
  googleLogin,
  facebookLogin,

  //CUSTOMERS
  getUsers,
  updateUserStatus,

  // LOCATION APIs
  addZone,
  getZones,
  checkServiceability,
  saveManualLocation,
  saveAutoLocation,
  getUserLocation,
  deleteUserLocation,

  // OTP
  sendOTP,
  verifyOTP,
  sendEmailOTP,
  verifyEmailOTP,

  // ADMIN / RIDER
  createAdmin,
  createRider,

  // PASSWORD FLOW
  forgotPassword,
  verifyForgotPasswordOTP,
  resetPassword,

  addAddress,
  getAddresses,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  deleteRider,
  updateRider,
  getRiders,
  updateRiderStatus,
 
} = require("../controllers/authController");


// ======================================================
// AUTH
// ======================================================
router.post("/signup", signup);
router.post("/login", login);

// SOCIAL LOGIN
router.post("/google-login", googleLogin);
router.post("/facebook-login", facebookLogin);

// ======================================================
// CUSTOMER
// ======================================================
router.get("/users", getUsers);
router.patch("/users/update/:id/status", updateUserStatus);


// ======================================================
// OTP
// ======================================================
router.post("/send-otp", sendOTP);
router.post("/verify-otp", verifyOTP);

// EMAIL OTP (optional)
// router.post("/send-email-otp", sendEmailOTP);
// router.post("/verify-email-otp", verifyEmailOTP);


// ======================================================
// LOCATION APIs
// ======================================================
router.post("/location/add-zone", addZone);
router.get("/location/zones/:userId", getZones);
router.get("/location/zones", getZones);

router.post("/location/check", checkServiceability);

router.post("/location/manual", saveManualLocation);
router.post("/location/auto", saveAutoLocation);
router.get("/location/user/:userId", getUserLocation);
router.delete("/location/delete/:userId", deleteUserLocation);


// ======================================================
// ADMIN
// ======================================================
router.post(
  "/admin",
  // auth,
  // authorizeRoles("superadmin"),
  createAdmin
);


// ======================================================
// RIDER
// ======================================================
router.post(
  "/rider",
  // auth,
  // authorizeRoles("admin", "superadmin"),
  createRider
);
router.get("/riders", getRiders);
router.put("/riders/update/:id", updateRider);
router.delete("/riders/delete/:id", deleteRider);
router.patch("/riders/update/:id/status", updateRiderStatus);


// ======================================================
// PASSWORD RESET FLOW
// ======================================================
router.post("/forgot-password", forgotPassword);

router.post(
  "/verify-forgot-password-otp",
  verifyForgotPasswordOTP
);

router.post("/reset-password", resetPassword);


router.post("/address", auth, addAddress);
router.get("/address", auth, getAddresses);
router.put("/address/:addressId", auth, updateAddress);
router.delete("/address/:addressId", auth, deleteAddress);
router.put("/address/default/:addressId", auth, setDefaultAddress);


module.exports = router;