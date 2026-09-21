const Feedback = require("../models/Feedback");
const Vendor = require("../models/Vendor");
const Product = require("../models/Product");
const User = require("../models/User");
const Order = require("../models/Order");

// Helper function: Recalculate average rating for any entity
const updateAverageRating = async (Model, entityId) => {
  const feedbacks = await Feedback.find({
    $or: [{ vendorId: entityId }, { products: entityId }],
  });

  if (feedbacks.length > 0) {
    const totalRating = feedbacks.reduce((sum, item) => sum + item.rating, 0);
    const avgRating = (totalRating / feedbacks.length).toFixed(1);

    await Model.findByIdAndUpdate(entityId, {
      "rating.average": Number(avgRating),
      "rating.count": feedbacks.length,
    });
  }
};

// ========================================================
// 1. CHECK IF POPUP SHOULD BE SHOWN TO USER
// ========================================================
exports.checkPendingFeedback = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const user = await User.findById(userId);

    // If user skipped 3 or more times, don't show popup
    if (user.feedbackSkipCount >= 3) {
      return res.status(200).json({
        showPopup: false,
        reason: "Skip limit reached",
      });
    }

    // Find the latest completed order that hasn't been reviewed or skipped
    const pendingOrder = await Order.findOne({
      userId,
      status: "completed",
      isReviewed: false,
      isSkipped: false,
    }).sort({ createdAt: -1 });

    if (!pendingOrder) {
      return res.status(200).json({
        showPopup: false,
        reason: "No pending orders to review",
      });
    }

    return res.status(200).json({
      showPopup: true,
      order: {
        orderId: pendingOrder._id,
        itemsCount: pendingOrder.items?.length || 0,
      },
    });
  } catch (err) {
    console.error("CHECK PENDING FEEDBACK ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ========================================================
// 2. SUBMIT FEEDBACK (PRODUCT + VENDOR + CAMPAIGN)
// ========================================================
exports.submitFeedback = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { orderId, rating, comment } = req.body;

    if (!orderId || !rating) {
      return res.status(400).json({
        success: false,
        message: "Order ID and rating are required.",
      });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    // Extract product IDs from order items
    const productIds = order.items.map((item) => item.productId);

    // 1. Create Feedback Document
    const newFeedback = await Feedback.create({
      orderId,
      userId,
      vendorId: order.vendorId,
      products: productIds,
      rating: Number(rating),
      comment: comment || "",
    });

    // 2. Update Vendor Average Rating
    await updateAverageRating(Vendor, order.vendorId);

    // 3. Update Product Average Ratings for all items in order
    for (const pId of productIds) {
      await updateAverageRating(Product, pId);
    }

    // 4. Mark Order as Reviewed
    order.isReviewed = true;
    await order.save();

    // 5. Reset User Skip Count on successful review
    await User.findByIdAndUpdate(userId, { feedbackSkipCount: 0 });

    return res.status(201).json({
      success: true,
      message: "Feedback submitted successfully!",
      data: newFeedback,
    });
  } catch (err) {
    console.error("SUBMIT FEEDBACK ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ========================================================
// 3. SKIP FEEDBACK POPUP
// ========================================================
exports.skipFeedback = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { orderId } = req.body;

    // Increment skip count for user
    const user = await User.findByIdAndUpdate(
      userId,
      { $inc: { feedbackSkipCount: 1 } },
      { new: true }
    );

    // Mark current order as skipped
    if (orderId) {
      await Order.findByIdAndUpdate(orderId, { isSkipped: true });
    }

    return res.status(200).json({
      success: true,
      message: "Feedback skipped",
      currentSkipCount: user.feedbackSkipCount,
    });
  } catch (err) {
    console.error("SKIP FEEDBACK ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ========================================================
// 4. GET REVIEWS FOR PRODUCT OR VENDOR
// ========================================================
exports.getFeedbacks = async (req, res) => {
  try {
    const { vendorId, productId } = req.query;

    let filter = {};
    if (vendorId) filter.vendorId = vendorId;
    if (productId) filter.products = productId;

    const feedbacks = await Feedback.find(filter)
      .populate("userId", "name profilePicture")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: feedbacks.length,
      data: feedbacks,
    });
  } catch (err) {
    console.error("GET FEEDBACK ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};