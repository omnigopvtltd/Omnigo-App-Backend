const router = require("express").Router();
const auth = require("../middleware/authMiddleware");

const {
  addToCart,
  getCart,
  updateCart,
  bulkAddToCart,
  removeItem
} = require("../controllers/cartController");

router.post("/add", auth, addToCart);
router.get("/", auth, getCart);
router.put("/update", auth, updateCart);
router.delete("/remove/:id", auth, removeItem);
router.post("/bulk-add", auth, bulkAddToCart);

module.exports = router;