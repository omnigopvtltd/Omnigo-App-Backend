const Deal = require("../models/Deal");
const Restaurant = require("../models/Restaurant");
const User = require("../models/User");

// =====================================
// GET ACTIVE DEALS (PUBLIC / APP)
// =====================================
exports.getDeals = async (req, res) => {
  try {
    const deals = await Deal.find({
      isActive: true,
      $or: [
        { validUntil: { $exists: false } },
        { validUntil: { $gte: new Date() } },
      ],
    })
      .populate("restaurantId", "name logo location")
      .sort({ isFeatured: -1, createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: deals.length,
      data: deals,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// =====================================
// CREATE DEAL (ADMIN) + SOCKET BROADCAST
// =====================================
exports.createDeal = async (req, res) => {
  try {
    const {
      title,
      description,
      bannerImage,
      restaurantId,
      originalPrice,
      discountPrice,
      tag,
      isFeatured,
      validUntil,
    } = req.body;

    const restaurantExists = await Restaurant.findById(restaurantId);
    if (!restaurantExists) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found",
      });
    }

    const newDeal = await Deal.create({
      title,
      description,
      bannerImage,
      restaurantId,
      originalPrice,
      discountPrice,
      tag,
      isFeatured,
      validUntil,
    });

    const populatedDeal = await Deal.findById(newDeal._id).populate(
      "restaurantId",
      "name logo location"
    );

    // ========================================================
    // REAL-TIME SOCKET BROADCAST
    // ========================================================
    const io = req.app.get("io");
    if (io) {
      // Broadcast to all connected app users or room listeners
      io.emit("newDealPublished", {
        message: "New deal available in your town!",
        deal: populatedDeal,
      });
    }

    // ========================================================
    // FCM PUSH NOTIFICATIONS TO ALL ACTIVE USERS
    // ========================================================
    try {
      // Find all users/customers with active FCM tokens
      const usersWithToken = await User.find({
        role: "user",
        fcmToken: { $exists: true, $ne: null },
      }).select("fcmToken");

      const notificationTitle = `🔥 Deal Alert: ${restaurant.name}!`;
      const notificationBody = title 
        ? `${title} for only Rs. ${discountPrice}!` 
        : `Check out today's special deal in your town!`;

      // Trigger push notifications asynchronously
      usersWithToken.forEach((u) => {
        if (u.fcmToken) {
          sendNotification(
            u.fcmToken,
            notificationTitle,
            notificationBody,
            {
              type: "new_deal",
              dealId: populatedDeal._id.toString(),
              restaurantId: restaurant._id.toString(),
              bannerImage: populatedDeal.bannerImage || "",
            }
          ).catch((fcmErr) =>
            console.error(`FCM error for token ${u.fcmToken}:`, fcmErr.message)
          );
        }
      });
    } catch (notifErr) {
      console.error("DEAL NOTIFICATION ERROR (Non-blocking):", notifErr.message);
    }

    return res.status(201).json({
      success: true,
      message: "Deal created successfully and broadcasted",
      deal: populatedDeal,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// =====================================
// TOGGLE DEAL STATUS (DEACTIVATE/EXPIRE)
// =====================================
exports.updateDealStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const updatedDeal = await Deal.findByIdAndUpdate(
      id,
      { isActive },
      { new: true }
    ).populate("restaurantId", "name logo");

    if (!updatedDeal) {
      return res.status(404).json({ success: false, message: "Deal not found" });
    }

    const io = req.app.get("io");
    if (io) {
      io.emit("dealStatusChanged", {
        dealId: updatedDeal._id,
        isActive: updatedDeal.isActive,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Deal status updated",
      deal: updatedDeal,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};