const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");

const {
  submitFeedback,
  getAllFeedbacks,
  getReviews,
  getRatingSummary,
  deleteFeedback,
} = require("../controllers/feedbackController");

// User Submit Feedback

router.post("/", auth, submitFeedback);

// Reviews List

router.get("/reviews", getReviews);

// Rating Summary

router.get("/summary", getRatingSummary);

// Admin All Feedbacks

router.get("/", auth, getAllFeedbacks);

// Delete Feedback

router.delete("/:id", auth, deleteFeedback);

module.exports = router;