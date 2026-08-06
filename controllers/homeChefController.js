const HomeChef = require("../models/HomeChef");
const Product = require("../models/Product"); 
const Deal = require("../models/Deal");      
const User = require("../models/User");
const sendNotification = require("../utils/sendNotification");

// ========================================================
// 1. CREATE HOME CHEF (ADMIN / CHEF ONBOARDING)
// ========================================================
exports.createHomeChef = async (req, res) => {
  try {
    const {
      name,
      description,
      logo,
      coverImage,
      cuisines,
      ownerId,
      contact,
      address,
      openingHours,
      isOpen,
      deliveryTime,
      minimumOrder,
      deliveryFee,
      commissionRate,
      status,
      isFeatured,
      lat,
      lng,
    } = req.body;

     if (!name) {
      return res.status(400).json({
        success: false,
        message: "Restaurant name is required",
      });
    }

    if (!contact?.phone) {
      return res.status(400).json({
        success: false,
        message: "Contact phone is required",
      });
    }

    if (!address?.street || !address?.city) {
      return res.status(400).json({
        success: false,
        message: "Address street and city are required",
      });
    }

    const payload = {
      name,
      slug: 
      description,
      logo,
      coverImage,
      cuisines: Array.isArray(cuisines) ? cuisines : [],
      ownerId: ownerId || null,
      contact,
      address: { ...address },
      openingHours,
      isOpen,
      deliveryTime,
      minimumOrder,
      deliveryFee,
      commissionRate,
      status,
      isFeatured,
    };

    if (lat !== undefined && lng !== undefined) {
      payload.address.location = {
        type: "Point",
        coordinates: [Number(lng), Number(lat)],
      };
    }

    const newChef = await HomeChef.create(payload);

    return res.status(201).json({
      success: true,
      message: "Home Chef registered successfully",
      homChef: newChef,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ========================================================
// 2. GET ALL HOME CHEFS (WITH SEARCH & FILTER)
// ========================================================
exports.getAllHomeChefs = async (req, res) => {
  try {
    const { search, isOpen, status } = req.query;

    // Filter by approved status by default (or query param if provided)
    const query = { status: status || "approved" };

    // Check availability (isOpen field in schema)
    if (isOpen !== undefined) {
      query.isOpen = isOpen === "true";
    }

    // Search by name or cuisines
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { cuisines: { $regex: search, $options: "i" } },
      ];
    }

    const chefs = await HomeChef.find(query).sort({
      "rating.average": -1,
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      count: chefs.length,
      chefs,
    });
  } catch (err) {
    console.error("GET HOME CHEFS ERROR:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ========================================================
// 3. GET SINGLE CHEF DETAILS WITH PRODUCTS & DEALS
// ========================================================
exports.getChefById = async (req, res) => {
  try {
    const { id } = req.params;

    const chef = await HomeChef.findById(id);
    if (!chef) {
      return res.status(404).json({
        success: false,
        message: "Home Chef not found",
      });
    }

    // Fetch associated Products and Deals using your existing models
    const products = await Product.find({ chefId: id, isAvailable: true });
    const deals = await Deal.find({ chefId: id, isActive: true });

    return res.status(200).json({
      success: true,
      chef,
      deals,
      products,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ========================================================
// 4. UPDATE HOME CHEF DETAILS
// ========================================================
exports.updateHomeChef = async (req, res) => {
  try {
    const { id } = req.params;

    const updatedChef = await HomeChef.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updatedChef) {
      return res.status(404).json({
        success: false,
        message: "Home Chef not found",
      });
    }

    // Emit live status update if availability changed
    const io = req.app.get("io");
    if (io) {
      io.emit("homeChefUpdated", {
        chefId: updatedChef._id,
        isAvailable: updatedChef.isAvailable,
        rating: updatedChef.rating,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Home Chef profile updated successfully",
      chef: updatedChef,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ========================================================
// 5. DELETE / DEACTIVATE HOME CHEF
// ========================================================
exports.deleteHomeChef = async (req, res) => {
  try {
    const { id } = req.params;

    // Soft delete by setting isActive to false
    const deletedChef = await HomeChef.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

    if (!deletedChef) {
      return res.status(404).json({
        success: false,
        message: "Home Chef not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Home Chef deactivated successfully",
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ========================================================
// 6. CREATE CHEF DEAL + SOCKET BROADCAST + FCM PUSH
// ========================================================
exports.createChefDeal = async (req, res) => {
  try {
    const { chefId } = req.params;

    const chef = await HomeChef.findById(chefId);
    if (!chef) {
      return res.status(404).json({
        success: false,
        message: "Home Chef not found",
      });
    }

    // Create deal using your existing Deal model
    const deal = await Deal.create({
      ...req.body,
      chefId,
    });

    // 🌟 REAL-TIME SOCKET BROADCAST
    const io = req.app.get("io");
    if (io) {
      io.emit("newChefDealPublished", {
        message: `New meal deal from ${chef.name}!`,
        deal,
        chef,
      });
    }

    // 🌟 FCM PUSH NOTIFICATIONS
    try {
      const users = await User.find({
        role: "user",
        fcmToken: { $exists: true, $ne: null },
      }).select("fcmToken");

      users.forEach((u) => {
        if (u.fcmToken) {
          sendNotification(
            u.fcmToken,
            `🍲 Fresh Meal Deal: ${chef.name}`,
            deal.title || "Every Meal Feels Like Home!",
            {
              type: "home_chef_deal",
              chefId: chef._id.toString(),
              dealId: deal._id.toString(),
            }
          ).catch((e) => console.error("FCM Error:", e.message));
        }
      });
    } catch (notifErr) {
      console.error("NOTIFICATION ERROR:", notifErr.message);
    }

    return res.status(201).json({
      success: true,
      message: "Home Chef deal created and notified successfully",
      deal,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};