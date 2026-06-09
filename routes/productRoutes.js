const router = require("express").Router();
const upload = require("../middleware/upload");

const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  likeProduct,
  unlikeProduct,
  getCategories,
} = require("../controllers/productController");

// ================= GET ROUTES =================

router.get("/getcategories", getCategories);
// Get All Products
router.get("/", getProducts);

// Get Single Product By ID
router.get("/:id", getProduct);

// ================= CRUD ROUTES =================

// Create Product
router.post("/", upload.single("image"), createProduct);
// Update Product
router.put(
  "/:id",
  upload.single("image"),
  updateProduct
);

// Delete Product
router.delete("/:id", deleteProduct);

// ================= LIKE ROUTES =================

// Like Product
router.post("/:id/like", likeProduct);

// Unlike Product
router.post("/:id/unlike", unlikeProduct);


module.exports = router;