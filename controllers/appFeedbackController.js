const AppFeedback = require("../models/AppFeedback");
const User = require("../models/User");

// ========================================================
// 1. CHECK IF FEEDBACK POPUP SHOULD SHOW
// ========================================================
exports.checkAppFeedbackStatus = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const user = await User.findById(userId).select(
      "hasSubmittedAppFeedback appFeedbackSkipCount appFeedbackCount"
    );

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Direct Checks:
    // 1. Pehle hi feedback de chuka hai
    // 2. 3 ya usse zyada baar skip kar chuka hai
    if (user.hasSubmittedAppFeedback || user.appFeedbackSkipCount >= 3) {
      return res.status(200).json({
        success: true,
        shouldShowPopup: false,
        reason: user.hasSubmittedAppFeedback ? "Already submitted" : "Max skips reached",
      });
    }

    // 3. Check condition: Kya 3 orders poore ho chuke hain?
    const shouldShowPopup = user.appFeedbackCount >= 3;

    return res.status(200).json({
      success: true,
      shouldShowPopup,
      skipCount: user.appFeedbackSkipCount,
      orderCount: user.appFeedbackCount,
    });
  } catch (err) {
    console.error("CHECK APP FEEDBACK ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ========================================================
// 2. SUBMIT APP FEEDBACK (ONCE PER USER)
// ========================================================
exports.submitAppFeedback = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { rating, comment, deviceInfo } = req.body;

    if (!rating) {
      return res.status(400).json({
        success: false,
        message: "Rating is required.",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Strict Check: User already submitted?
    if (user.hasSubmittedAppFeedback) {
      return res.status(400).json({
        success: false,
        message: "You have already submitted app feedback.",
      });
    }

    // 1. Create App Feedback Document
    const feedback = await AppFeedback.create({
      userId,
      rating: Number(rating),
      comment: comment || "",
      deviceInfo: deviceInfo || "",
    });

    // 2. Mark User as Submitted
    user.hasSubmittedAppFeedback = true;
    await user.save();

    return res.status(201).json({
      success: true,
      message: "Thank you for rating our app!",
      data: feedback,
    });
  } catch (err) {
    console.error("SUBMIT APP FEEDBACK ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ========================================================
// 3. SKIP APP FEEDBACK
// ========================================================
exports.skipAppFeedback = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Increment skip count & Reset order counter for next cycle
    user.appFeedbackSkipCount += 1;
    user.appFeedbackCount = 0; // Reset count so it checks after next 3 orders if skip < 3

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Feedback skipped successfully.",
      skipCount: user.appFeedbackSkipCount,
      showAgainInFuture: user.appFeedbackSkipCount < 3,
    });
  } catch (err) {
    console.error("SKIP APP FEEDBACK ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};