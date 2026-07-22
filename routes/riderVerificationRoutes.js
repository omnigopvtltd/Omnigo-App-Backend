const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/rolemiddleware");
const {
  submitCnicVerification,
  submitFaceVerification,
  getMyVerificationStatus,
  reviewCnicVerification,
  reviewFaceVerification,
  getPendingVerifications,
} = require("../controllers/riderVerificationController");

// Rider self-service
router.get("/me", auth, role("rider"), getMyVerificationStatus);
router.post("/cnic", auth, role("rider"), submitCnicVerification);
router.post("/face", auth, role("rider"), submitFaceVerification);

// Admin review
router.get("/pending", auth, role("admin"), getPendingVerifications);
router.patch("/:id/cnic", auth, role("admin"), reviewCnicVerification);
router.patch("/:id/face", auth, role("admin"), reviewFaceVerification);

module.exports = router;