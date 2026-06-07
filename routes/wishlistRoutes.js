const router = require("express").Router();

const auth = require("../middleware/authMiddleware");

const {
  toggleFavorite,
  getFavorites,
  removeFavorite,
  checkFavorite,
} = require("../controllers/wishlistController");

router.post("/toggle", auth, toggleFavorite);

router.get("/", auth, getFavorites);

router.get(
  "/check/:productId",
  auth,
  checkFavorite
);
router.delete(
  "/remove/:productId",
  auth,
  removeFavorite
);

module.exports = router;