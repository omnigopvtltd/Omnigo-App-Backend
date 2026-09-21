// const User = require("../models/User");
// const Product = require("../models/Product");

// // ADD / REMOVE FAVORITE
// exports.toggleFavorite = async (req, res) => {
//   try {
//     const { productId } = req.body;

//     const product = await Product.findById(productId);

//     if (!product) {
//       return res.status(404).json({
//         success: false,
//         message: "Product not found",
//       });
//     }

//     const user = await User.findById(req.user.id);

//     const exists = user.favorites.some(
//       (id) => id.toString() === productId
//     );

//     if (exists) {
//       user.favorites = user.favorites.filter(
//         (id) => id.toString() !== productId
//       );

//       await user.save();

//       return res.json({
//         success: true,
//         message: "Removed from favorites",
//         isFavorite: false,
//       });
//     }

//     user.favorites.push(productId);

//     await user.save();

//     res.json({
//       success: true,
//       message: "Added to favorites",
//       isFavorite: true,
//     });

//   } catch (err) {
//     console.log(err);

//     res.status(500).json({
//       success: false,
//       message: "Server Error",
//     });
//   }
// };

// // GET ALL FAVORITES
// exports.getFavorites = async (req, res) => {
//   try {

//     const user = await User.findById(req.user.id)
//       .populate("favorites");

//     res.json({
//       success: true,
//       total: user.favorites.length,
//       favorites: user.favorites,
//     });

//   } catch (err) {

//     res.status(500).json({
//       success: false,
//       message: "Server Error",
//     });

//   }
// };

// // CHECK FAVORITE STATUS
// exports.checkFavorite = async (req, res) => {
//   try {

//     const user = await User.findById(req.user.id);

//     const isFavorite = user.favorites.some(
//       (id) =>
//         id.toString() === req.params.productId
//     );

//     res.json({
//       success: true,
//       isFavorite,
//     });

//   } catch (err) {

//     res.status(500).json({
//       success: false,
//       message: "Server Error",
//     });

//   }
// };

// // REMOVE FAVORITE
// exports.removeFavorite = async (req, res) => {
//   try {
//     const { productId } = req.params;

//     const user = await User.findById(req.user.id);

//     user.favorites = user.favorites.filter(
//       (id) => id.toString() !== productId
//     );

//     await user.save();

//     res.json({
//       success: true,
//       message: "Favorite removed successfully",
//       favorites: user.favorites,
//     });

//   } catch (err) {
//     console.log(err);

//     res.status(500).json({
//       success: false,
//       message: "Server Error",
//     });
//   }
// };
const User = require("../models/User");
const Product = require("../models/Product");
const Vendor = require("../models/Vendor");
const Campaign = require("../models/Campaign");
const Order = require("../models/Order");
const mongoose = require("mongoose");
const Deal = require("../models/Deal");

// Helper to get Model dynamically based on target type
const getTargetModel = (type) => {
  const modelType = (type || "product").toLowerCase();
  switch (modelType) {
    case "vendor":
      return Vendor;
    case "campaign":
      return Campaign;
    case "deal":
      return Deal;
    case "order":
      return Order;
    case "product":
    default:
      return Product;
  }
};

// 1. UNIVERSAL TOGGLE FAVORITE (For Products, Vendors, Campaigns, Orders)
exports.toggleFavorite = async (req, res) => {
  try {
    const { productId, itemId, type = "product" } = req.body;
    const userId = req.user.id;
    
    // Support both productId or generic itemId
    const targetId = itemId || productId;

    if (!mongoose.Types.ObjectId.isValid(targetId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Item ID",
      });
    }

    const TargetModel = getTargetModel(type);
    const item = await TargetModel.findById(targetId);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: `${type} not found`,
      });
    }

    const likesList = item.likes || [];
    const isLiked = likesList.some(
      (id) => id.toString() === userId.toString()
    );

    let updatedItem;

    if (isLiked) {
      // Remove userId from likes array
      updatedItem = await TargetModel.findByIdAndUpdate(
        targetId,
        { $pull: { likes: userId } },
        { new: true }
      );

      return res.status(200).json({
        success: true,
        message: `Removed from favorites`,
        isFavorite: false,
        isFavourite: false,
        data: {
          ...updatedItem.toObject(),
          isFavorite: false,
          isFavourite: false,
        },
      });
    }

    // Add userId to likes array
    updatedItem = await TargetModel.findByIdAndUpdate(
      targetId,
      { $addToSet: { likes: userId } },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: `Added to favorites`,
      isFavorite: true,
      isFavourite: true,
      data: {
        ...updatedItem.toObject(),
        isFavorite: true,
        isFavourite: true,
      },
    });
  } catch (err) {
    console.error("TOGGLE FAVORITE ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// 2. GET ALL FAVORITES FOR CURRENT USER BY TYPE
exports.getFavorites = async (req, res) => {
  try {
    const userId = req.user.id;
    const { type = "product" } = req.query; // e.g. /favorites?type=vendor

    const TargetModel = getTargetModel(type);
    const rawFavorites = await TargetModel.find({ likes: userId });

    const favorites = rawFavorites.map((doc) => ({
      ...doc.toObject(),
      isFavorite: true,
      isFavourite: true,
    }));

    return res.status(200).json({
      success: true,
      type,
      total: favorites.length,
      favorites,
    });
  } catch (err) {
    console.error("GET FAVORITES ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// ========================================================
// GET ALL FAVORITES (Products, Vendors, Campaigns, Deals)
// ========================================================
exports.getAllFavorites = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;

    // Sabhi models se parallel queries run karein
    const [products, vendors, campaigns, deals] = await Promise.all([
      Product.find({ likes: userId }).lean(),
      Vendor.find({ likes: userId }).lean(),
      Campaign.find({ likes: userId }).lean(), // Make sure Campaign model imported hai
      Deal.find({ likes: userId }).lean(),         // Make sure Deal model imported hai
    ]);

    // Helper function to attach isFavorite flag
    const formatFavorites = (items) =>
      items.map((item) => ({
        ...item,
        isFavorite: true,
        isFavourite: true,
      }));

    const formattedProducts = formatFavorites(products);
    const formattedVendors = formatFavorites(vendors);
    const formattedCampaigns = formatFavorites(campaigns);
    const formattedDeals = formatFavorites(deals);

    const grandTotal =
      formattedProducts.length +
      formattedVendors.length +
      formattedCampaigns.length +
      formattedDeals.length;

    return res.status(200).json({
      success: true,
      totalFavorites: grandTotal,
      data: {
        products: formattedProducts,
        vendors: formattedVendors,
        campaigns: formattedCampaigns,
        deals: formattedDeals,
      },
    });
  } catch (err) {
    console.error("GET ALL FAVORITES ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: err.message,
    });
  }
};

// 3. CHECK FAVORITE STATUS FOR SPECIFIC ITEM
exports.checkFavorite = async (req, res) => {
  try {
    const { productId } = req.params;
    const { type = "product" } = req.query;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Item ID",
      });
    }

    const TargetModel = getTargetModel(type);
    const item = await TargetModel.findById(productId);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: `${type} not found`,
      });
    }

    const likesList = item.likes || [];
    const isFavorite = likesList.some(
      (id) => id.toString() === userId.toString()
    );

    return res.status(200).json({
      success: true,
      isFavorite,
      isFavourite: isFavorite,
    });
  } catch (err) {
    console.error("CHECK FAVORITE ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// 4. DIRECTLY REMOVE FAVORITE VIA LIKES
exports.removeFavorite = async (req, res) => {
  try {
    const { productId } = req.params;
    const { type = "product" } = req.query;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Item ID",
      });
    }

    const TargetModel = getTargetModel(type);

    await TargetModel.findByIdAndUpdate(productId, {
      $pull: { likes: userId },
    });

    const rawFavorites = await TargetModel.find({ likes: userId });

    const updatedFavorites = rawFavorites.map((doc) => ({
      ...doc.toObject(),
      isFavorite: true,
      isFavourite: true,
    }));

    return res.status(200).json({
      success: true,
      message: "Favorite removed successfully",
      favorites: updatedFavorites,
    });
  } catch (err) {
    console.error("REMOVE FAVORITE ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};