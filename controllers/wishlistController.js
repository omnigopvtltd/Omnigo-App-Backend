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
const mongoose = require("mongoose");

// ADD / REMOVE FAVORITE (TOGGLE VIA PRODUCT LIKES)
exports.toggleFavorite = async (req, res) => {
  try {
    const { productId } = req.body;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Product ID",
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const likesList = product.likes || [];
    const isLiked = likesList.some(
      (id) => id.toString() === userId.toString()
    );

    if (isLiked) {
      // Remove userId from likes array and set isFavourite: false
      const updatedProduct = await Product.findByIdAndUpdate(
        productId,
        {
          $pull: { likes: userId },
          $set: { isFavourite: false },
        },
        { new: true }
      );

      return res.status(200).json({
        success: true,
        message: "Removed from favorites",
        isFavorite: false,
        isFavourite: false,
        product: updatedProduct,
      });
    }

    // Add userId to likes array and set isFavourite: true
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      {
        $addToSet: { likes: userId },
        $set: { isFavourite: true },
      },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Added to favorites",
      isFavorite: true,
      isFavourite: true,
      product: updatedProduct,
    });
  } catch (err) {
    console.error("TOGGLE FAVORITE ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// GET ALL FAVORITES FOR CURRENT USER
exports.getFavorites = async (req, res) => {
  try {
    const userId = req.user.id;

    // Direct wo tamaam products fetch karein jinki likes array main user.id ho
    const favorites = await Product.find({ likes: userId });

    return res.status(200).json({
      success: true,
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

// CHECK FAVORITE STATUS FOR A SPECIFIC PRODUCT
exports.checkFavorite = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Product ID",
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const likesList = product.likes || [];
    const isFavorite = likesList.some(
      (id) => id.toString() === userId.toString()
    );

    return res.status(200).json({
      success: true,
      isFavorite,
    });
  } catch (err) {
    console.error("CHECK FAVORITE ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// DIRECTLY REMOVE FAVORITE VIA PRODUCT LIKES
exports.removeFavorite = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Product ID",
      });
    }

    await Product.findByIdAndUpdate(productId, {
      $pull: { likes: userId },
    });

    // Updated user's favorite products send back karne ke liye
    const updatedFavorites = await Product.find({ likes: userId });

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