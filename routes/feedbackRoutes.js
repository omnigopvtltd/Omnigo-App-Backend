const express = require("express");

const router = express.Router();

const auth = require("../middleware/authMiddleware");

const {
  checkPendingFeedback,
  submitFeedback,
  skipFeedback,
  getFeedbacks,
} = require("../controllers/feedbackController");

// ========================================================
// 1. Check if feedback popup should be shown
// ========================================================
router.get("/pending", auth, checkPendingFeedback);

// ========================================================
// 2. Submit feedback
// ========================================================
router.post("/", auth, submitFeedback);

// ========================================================
// 3. Skip feedback popup
// ========================================================
router.post("/skip", auth, skipFeedback);

// ========================================================
// 4. Get reviews / feedbacks
// ========================================================
router.get("/", getFeedbacks);

module.exports = router;