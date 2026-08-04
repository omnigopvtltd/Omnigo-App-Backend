const express = require("express");
const router = express.Router();

const {
  createProduct,
  getAllProducts,
  getProductDetails,
  updateProduct,
  deleteProduct,
  searchProducts,
  getProductsByRestaurant,
  getProductsByCategory,
  getProductsBySubCategory,
  getFeaturedProducts,
  getPopularProducts,
  getRecommendedProducts,
} = require("../controllers/fastFoodProductController");


// =====================================
// PRODUCT CRUD
// =====================================

router.post("/product", createProduct);

router.get("/products", getAllProducts);

router.get("/product/:id", getProductDetails);

router.put("/product/:id", updateProduct);

router.delete("/product/:id", deleteProduct);


// =====================================
// SEARCH
// =====================================

router.get("/products/search", searchProducts);


// =====================================
// RESTAURANT PRODUCTS
// =====================================

router.get(
  "/products/restaurant/:restaurantId",
  getProductsByRestaurant
);


// =====================================
// CATEGORY PRODUCTS
// =====================================

router.get(
  "/products/category/:categoryId",
  getProductsByCategory
);


// =====================================
// SUB CATEGORY PRODUCTS
// =====================================

router.get(
  "/products/subcategory/:subCategoryId",
  getProductsBySubCategory
);


// =====================================
// FEATURED PRODUCTS
// =====================================

router.get(
  "/products/featured/all",
  getFeaturedProducts
);


// =====================================
// POPULAR PRODUCTS
// =====================================

router.get(
  "/products/popular/all",
  getPopularProducts
);


// =====================================
// RECOMMENDED PRODUCTS
// =====================================

router.get(
  "/products/recommended/all",
  getRecommendedProducts
);

module.exports = router;