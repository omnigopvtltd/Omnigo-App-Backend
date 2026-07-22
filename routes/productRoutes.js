// const router = require("express").Router();
// const upload = require("../middleware/upload");

// const {
//   getProducts,
//   getProduct,
//   createProduct,
//   updateProduct,
//   deleteProduct,
//   likeProduct,
//   unlikeProduct,
//   getCategories,
// } = require("../controllers/productController");

// // ================= GET ROUTES =================

// router.get("/getcategories", getCategories);
// // Get All Products
// router.get("/", getProducts);

// // Get Single Product By ID
// router.get("/:id", getProduct);

// // ================= CRUD ROUTES =================

// // Create Product
// router.post("/", upload.single("image"), createProduct);
// // Update Product
// router.put(
//   "/:id",
//   upload.single("image"),
//   updateProduct
// );

// // Delete Product
// router.delete("/:id", deleteProduct);

// // ================= LIKE ROUTES =================

// // Like Product
// router.post("/:id/like", likeProduct);

// // Unlike Product
// router.post("/:id/unlike", unlikeProduct);


// module.exports = router;

const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/rolemiddleware");
const {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  toggleAvailability,
  deleteProduct,
} = require("../controllers/productController");

router.get("/", auth, role("admin"), getAllProducts);
router.post("/create", auth, role("admin"), createProduct);
router.get("/:id", auth, role("admin"), getProductById);
router.put("/update/:id", auth, role("admin"), updateProduct);
router.patch("/:id/availability", auth, role("admin"), toggleAvailability);
router.delete("/delete/:id", auth, role("admin"), deleteProduct);

module.exports = router;