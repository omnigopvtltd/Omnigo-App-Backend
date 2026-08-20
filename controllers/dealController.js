const Deal = require("../models/Deal");
const Product = require("../models/Product");
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
      .select("title bannerImage restaurantId")
      .sort({ isFeatured: -1, createdAt: -1 });

    const restaurants = await Restaurant.find({
      _id: { $in: deals.map((d) => d.restaurantId) },
    }).select("name logo");

    const allDeals = [...deals, ...restaurants];

    return res.status(200).json({
      success: true,
      count: deals.length,
      data: allDeals,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// =====================================
// GET ACTIVE DEALS By Id (PUBLIC / APP)
// =====================================
exports.getDealsById = async (req, res) => {
  try {
    const { id } = req.params;

    const deals = await Deal.find({
      _id: id,
      isActive: true,
    })
      // .populate("restaurantId", "name logo location")
      // .select("title bannerImage restaurantId")
      // .sort({ isFeatured: -1, createdAt: -1 });

    const restaurants = await Restaurant.find({
      _id: { $in: deals.map((d) => d.restaurantId) },
    }).select("name logo");

    const allDeals = [...deals, ...restaurants];

    return res.status(200).json({
      success: true,
      count: deals.length,
      data: allDeals,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// =====================================
// GET DEALS DETAILS
// =====================================
exports.getDealDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const deal = await Deal.findOne({
      _id: id,
      isActive: true,
    })
      .select(
        "title description image bannerImage items originalPrice discountPrice dealType tag validFrom validUntil"
      )
      .populate("restaurantId", "name logo location")
      .lean();

    if (!deal) {
      return res.status(404).json({
        success: false,
        message: "Deal not found or inactive",
      });
    }

    // 1. Format deal products & calculate item total sum
    let calculatedItemsTotal = 0;

    const formattedProducts = deal.items.map((item) => {
      const price = Number(item.price) || 0;
      const quantity = Number(item.quantity) || 1;
      const total = price * quantity;
      
      calculatedItemsTotal += total;

      return {
        productId: item.productId,
        name: item.name,
        image: item.image,
        category: item.category,
        price,
        quantity,
        total,
      };
    });

    // 2. Compute original, deal, and saved amounts
    const originalPrice = Number(deal.originalPrice) || calculatedItemsTotal;
    const discountPrice = Number(deal.discountPrice) || 0;
    const amountSaved = Math.max(0, originalPrice - discountPrice);

    return res.status(200).json({
      success: true,
      data: {
        _id: deal._id,
        title: deal.title,
        description: deal.description,
        image: deal.image,
        bannerImage: deal.bannerImage,
        restaurant: deal.restaurantId,
        dealType: deal.dealType,
        tag: deal.tag,
        pricing: {
          originalPrice,       // Total original price before discount
          discountPrice,       // Deal final price
          amountSaved,         // Price saved after discount
          itemsSubtotal: calculatedItemsTotal, // Sum of all items inside deal
        },
        products: formattedProducts, // Array of products inside this deal
        validFrom: deal.validFrom,
        validUntil: deal.validUntil,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// =====================================
// GET DEALS By Restaurant ID (PUBLIC / APP)
// =====================================
exports.getDealsByRestaurantId = async (req, res) => {
  try {
    const { restaurantId } = req.params;

    const deals = await Deal.find({
      isActive: true,
      restaurantId,
    })
    .select("title image restaurantId originalPrice dealType")
      // .populate("restaurantId", "name logo location")
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
// GET DAILY DEALS By Restaurant ID (PUBLIC / APP)
// =====================================
exports.getDailyDeals = async (req, res) => {
  try {
    const { type } = req.query; // e.g., "daily-deal"

    let requestedType;
    if (type === "daily-deal") {
      requestedType = "Daily Deal";
    }
    
    const deals = await Deal.find({
      isActive: true,
      dealType: requestedType,
    })
      .select(
        "title description image restaurantId originalPrice discountPrice dealType",
      )
      .populate("restaurantId", "name logo rating deliveryFee deliveryTime")
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
      image,
      bannerImage,
      restaurantId,
      items, // 1. Destructured items array
      originalPrice,
      discountPrice,
      dealType,
      tag,
      isFeatured,
      validUntil,
    } = req.body;

    // 2. Verify restaurant exists
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found",
      });
    }

    // 3. Process & validate items array
    let formattedItems = [];
    let calculatedItemsTotal = 0;

    if (Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        // Fetch product from DB to auto-populate missing fields if needed
        const product = await Product.findById(item.productId);
        
        const price = Number(item.price || product?.price || 0);
        const quantity = Number(item.quantity || 1);
        const total = price * quantity;

        calculatedItemsTotal += total;

        formattedItems.push({
          productId: item.productId,
          name: item.name || product?.name || "",
          image: item.image || product?.image || "",
          category: item.category || product?.category || "",
          price,
          quantity,
          total,
        });
      }
    }

    // Fallback to calculated total if originalPrice is not explicitly sent
    const finalOriginalPrice = Number(originalPrice) || calculatedItemsTotal;

    // 4. Create new deal with items
    const newDeal = await Deal.create({
      title,
      description,
      image,
      bannerImage,
      restaurantId,
      items: formattedItems,
      originalPrice: finalOriginalPrice,
      discountPrice: Number(discountPrice) || 0,
      dealType,
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
      io.emit("newDealPublished", {
        message: "New deal available in your town!",
        deal: populatedDeal,
      });
    }

    // ========================================================
    // FCM PUSH NOTIFICATIONS TO ALL ACTIVE USERS
    // ========================================================
    try {
      const usersWithToken = await User.find({
        role: "user",
        fcmToken: { $exists: true, $ne: null },
      }).select("fcmToken");

      // Fixed: restaurant variable now correctly matches restaurant.name
      const notificationTitle = `🔥 Deal Alert: ${restaurant.name}!`;
      const notificationBody = title
        ? `${title} for only Rs. ${discountPrice}!`
        : `Check out today's special deal in your town!`;

      usersWithToken.forEach((u) => {
        if (u.fcmToken) {
          sendNotification(u.fcmToken, notificationTitle, notificationBody, {
            type: "new_deal",
            dealId: populatedDeal._id.toString(),
            restaurantId: restaurant._id.toString(),
            bannerImage: populatedDeal.bannerImage || "",
          }).catch((fcmErr) =>
            console.error(`FCM error for token ${u.fcmToken}:`, fcmErr.message)
          );
        }
      });
    } catch (notifErr) {
      console.error(
        "DEAL NOTIFICATION ERROR (Non-blocking):",
        notifErr.message
      );
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
      { new: true },
    ).populate("restaurantId", "name logo");

    if (!updatedDeal) {
      return res
        .status(404)
        .json({ success: false, message: "Deal not found" });
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
