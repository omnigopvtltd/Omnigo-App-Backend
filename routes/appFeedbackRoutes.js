const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware"); // Aapka auth middleware
const {
  checkAppFeedbackStatus,
  submitAppFeedback,
  skipAppFeedback,
} = require("../controllers/appFeedbackController");

router.get("/check-status", authMiddleware, checkAppFeedbackStatus);
router.post("/submit", authMiddleware, submitAppFeedback);
router.post("/skip", authMiddleware, skipAppFeedback);

module.exports = router;