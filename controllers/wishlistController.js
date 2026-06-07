const User = require("../models/User");
const Product = require("../models/Product");

// ADD / REMOVE FAVORITE
exports.toggleFavorite = async (req, res) => {
  try {
    const { productId } = req.body;

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const user = await User.findById(req.user.id);

    const exists = user.favorites.some(
      (id) => id.toString() === productId
    );

    if (exists) {
      user.favorites = user.favorites.filter(
        (id) => id.toString() !== productId
      );

      await user.save();

      return res.json({
        success: true,
        message: "Removed from favorites",
        isFavorite: false,
      });
    }

    user.favorites.push(productId);

    await user.save();

    res.json({
      success: true,
      message: "Added to favorites",
      isFavorite: true,
    });

  } catch (err) {
    console.log(err);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// GET ALL FAVORITES
exports.getFavorites = async (req, res) => {
  try {

    const user = await User.findById(req.user.id)
      .populate("favorites");

    res.json({
      success: true,
      total: user.favorites.length,
      favorites: user.favorites,
    });

  } catch (err) {

    res.status(500).json({
      success: false,
      message: "Server Error",
    });

  }
};

// CHECK FAVORITE STATUS
exports.checkFavorite = async (req, res) => {
  try {

    const user = await User.findById(req.user.id);

    const isFavorite = user.favorites.some(
      (id) =>
        id.toString() === req.params.productId
    );

    res.json({
      success: true,
      isFavorite,
    });

  } catch (err) {

    res.status(500).json({
      success: false,
      message: "Server Error",
    });

  }
};

// REMOVE FAVORITE
exports.removeFavorite = async (req, res) => {
  try {
    const { productId } = req.params;

    const user = await User.findById(req.user.id);

    user.favorites = user.favorites.filter(
      (id) => id.toString() !== productId
    );

    await user.save();

    res.json({
      success: true,
      message: "Favorite removed successfully",
      favorites: user.favorites,
    });

  } catch (err) {
    console.log(err);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};