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
  sendRiderOTP,
  verifyRiderOTP,
  saveToken,
  completeRiderProfile,
  uploadVerificationSelfie,
  submitVerification,
  getVerificationStatus,
  approveRiderVerification,
  rejectRiderVerification,
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
  getAllUsers,
  validateSignup,
  getZonesById,
  deleteZone,
  updateZone,
  toggleZoneStatus,

  // Vendor
  completeVendorProfile,
  getUserProfile,
  logout,
  updateUserProfile,
  getUser
 
} = require("../controllers/authController");
const { getRiderById } = require("../controllers/riderController");
const upload = require("../middleware/upload");
const role= require("../middleware/rolemiddleware");

// ======================================================
// AUTH
// ======================================================
// router.post("/signup", signup);
router.post("/signup", validateSignup, signup);
router.post("/login", login);
router.post("/logout", auth, logout);

// SOCIAL LOGIN
router.post("/google-login", googleLogin);
router.post("/facebook-login", facebookLogin);

// ======================================================
// CUSTOMER
// ======================================================
router.get("/all-users", getAllUsers);
router.get("/users", getUsers);
router.get("/user/me", auth, getUser);
router.get("/my-profile/:id", getUserProfile);
router.put("/my-profile/update/:id", upload.single("profilePicture"), updateUserProfile);
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
router.get("/location/zones", getZones);
router.get("/location/zone/:id", getZonesById);
router.get("/location/zones/:userId", getZones);
router.put("/location/zone/update/:id", updateZone);
router.patch("/location/zone/update/:id/status", toggleZoneStatus);
router.delete("/location/zone/delete/:id", deleteZone);

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

router.post(
  "/save-token",
  auth,
  saveToken
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
router.get("/riders/:id", getRiderById);
router.put("/riders/update/:id", updateRider);
router.delete("/riders/delete/:id", deleteRider);
router.patch("/riders/update/:id/status", updateRiderStatus);


router.post("/rider/send-otp", sendRiderOTP);

router.post("/rider/verify-otp", verifyRiderOTP);

router.put(
  "/complete-profile",
  auth,
  completeRiderProfile
);

router.post(
  "/rider/verification/upload",
  auth,
  uploadVerificationSelfie
);

router.post(
  "/rider/verification/submit",
  auth,
  submitVerification
);

router.get(
  "/rider/verification/status",
  auth,
  getVerificationStatus
);

router.put(
  "/admin/rider/:riderId/approve",
  auth,
  authorizeRoles("admin", "superadmin"),
  approveRiderVerification
);

router.put(
  "/admin/rider/:riderId/reject",
  auth,
  authorizeRoles("admin", "superadmin"),
  rejectRiderVerification
);






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

// ======================
// Vendor Profile
// ======================

router.put(
  "/vendor/complete-profile",
  auth,
  completeVendorProfile
);

module.exports = router;