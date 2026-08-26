const router = require("express").Router();
const auth = require("../middleware/authMiddleware");

const {
  toggleFavorite,
  getFavorites,
  removeFavorite,
  checkFavorite,
} = require("../controllers/wishlistController");

// POST /api/wishlist/toggle - Add/Remove favorite toggle
router.patch("/toggle", auth, toggleFavorite);

// GET /api/wishlist - Fetch all user favorites
router.get("/", auth, getFavorites);

// GET /api/wishlist/check/:productId - Check if a specific product is favorited
router.get("/check/:productId", auth, checkFavorite);

// DELETE /api/wishlist/:productId (or /remove/:productId) - Remove favorite directly
router.delete("/remove/:productId", auth, removeFavorite);

module.exports = router;