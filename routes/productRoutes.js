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
  getProductsByCategory,
  getProductsByType,
  getPreviouslyOrderedItems,
  getProductsByRestaurantCategories,
  getProductsByRestaurantTypes,
  getPreviouslyOrderedItemsByCategory,
  getProductsByRestaurantSubcategories,
  getProductsByRestaurant,
  getProductsByHomeChef,
  getProductsByHomeChefTypes,
  getProductDetails,
  getOmnigoMartProducts,
  getOmnigoMartProductsCategries,
} = require("../controllers/productController");

router.get("/", auth, getAllProducts);
router.get("/omnigo-mart-products", auth, getOmnigoMartProducts);
router.get("/omnigo-mart-products-categories", auth, getOmnigoMartProductsCategries);
router.get("/product-by-category", auth, getProductsByCategory);
router.get("/product-by-type", auth, getProductsByType);
// Endpoint for "Craving It Again?" section
router.get("/previously-ordered", auth, getPreviouslyOrderedItems);
router.get("/previously-ordered/:category", auth,  getPreviouslyOrderedItemsByCategory);
router.get("/product-by-restaurant-categories/:restaurantId", auth, getProductsByRestaurantCategories);
router.get("/product-by-restaurant-subcategories/:restaurantId", auth, getProductsByRestaurantSubcategories);
router.get("/product-by-restaurant-types/:restaurantId", auth, getProductsByRestaurantTypes);
router.get("/product-by-home-chef-types/:homeChefId", auth, getProductsByHomeChefTypes);
router.get("/product-by-restaurant/:restaurantId", auth, getProductsByRestaurant);
router.get("/product-by-home-chef/:homeChefId", auth, getProductsByHomeChef);

router.post("/create", auth, createProduct);
router.get("/:id", auth, getProductById);
router.get("/product-details/:id", auth, getProductDetails);
router.put("/update/:id", auth, updateProduct);
router.patch("/:id/availability", auth, toggleAvailability);
router.delete("/delete/:id", auth, deleteProduct);

module.exports = router;