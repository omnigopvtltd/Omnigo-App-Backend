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
  vendorMenu,
  getVendorPerformance,
  getVendorDashboardOverview,
  getVendorProfile,
  toggleRushMode,
  getAllVendorBrands,
  getAllHomeChefs,
  getHomeChefById,
  getVendorById,
  getVendorCategories,
  getVendorBranchById,
  getAllVendors,
  vendorMenuProducts,
} = require("../controllers/vendorController");
const { saveFcmToken } = require("../controllers/vendorController");
const upload = require("../middleware/upload");

router.get("/all-vendors", auth, getAllVendors);
router.get("/dashboard/overview", auth, getVendorDashboardOverview);
router.get("/vendor-menu", auth, vendorMenu);
router.get("/vendor-performance", auth, getVendorPerformance);
router.get("/vendor-profile", auth, getVendorProfile);
router.get("/brands", auth, getAllVendorBrands);
router.get("/home-chefs", auth, getAllHomeChefs);
router.get("/categories", auth, getVendorCategories);

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


// ======================================================
// Dashboard and Analytics Routes
// ======================================================
router.put(
  "/vendor-profile/update",
  upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
  ]),
  auth,
  updateVendorProfile,
);

router.patch("/toggle-rushmode", auth, toggleRushMode);
router.get("/vendor-menu/:vendorId", auth, vendorMenu);
router.get("/vendor-menu-products/:vendorId", auth, vendorMenuProducts);
router.get("/vendor-branches/:vendorId", auth, getVendorBranchById);

router.get("/home-chef/:id", auth, getHomeChefById);
router.get("/:id", auth, getVendorById);

module.exports = router;
