const Feedback = require("../models/Feedback");

// ================= SUBMIT FEEDBACK =================

exports.submitFeedback = async (req, res) => {
  try {
    const {
      rating,
      feedbackType,
      message,
      image,
    } = req.body;

    const feedback = await Feedback.create({
      user: req.user.id,
      rating,
      feedbackType,
      message,
      image,
    });

    res.status(201).json({
      success: true,
      message: "Feedback submitted successfully",
      data: feedback,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ================= GET ALL FEEDBACK =================

exports.getAllFeedbacks = async (req, res) => {
  try {
    const feedbacks = await Feedback.find()
      .populate("user", "name email profileImage")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: feedbacks.length,
      data: feedbacks,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ================= GET REVIEWS =================

exports.getReviews = async (req, res) => {
  try {
    const reviews = await Feedback.find({
      message: { $ne: "" },
    })
      .populate("user", "name profileImage")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: reviews.length,
      data: reviews,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ================= RATING SUMMARY =================

exports.getRatingSummary = async (req, res) => {
  try {
    const feedbacks = await Feedback.find();

    const ratings = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };

    let total = 0;

    feedbacks.forEach((item) => {
      ratings[item.rating]++;
      total += item.rating;
    });

    const totalReviews = feedbacks.length;

    const averageRating =
      totalReviews > 0
        ? (total / totalReviews).toFixed(1)
        : 0;

    res.json({
      success: true,
      averageRating,
      totalReviews,
      ratings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ================= DELETE FEEDBACK =================

exports.deleteFeedback = async (req, res) => {
  try {
    await Feedback.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Feedback deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};