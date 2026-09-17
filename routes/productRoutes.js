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
  getProductsByVendorCategories,
  getProductsByVendorTypes,
  getPreviouslyOrderedItemsByCategory,
  getProductsByVendorSubcategories,
  getProductsByVendor,
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

router.post("/create", auth, createProduct);
router.put("/update/:id", auth, updateProduct);
router.patch("/:id/availability", auth, toggleAvailability);
router.delete("/delete/:id", auth, deleteProduct);

router.get("/product-by-vendor-categories/:vendorId", auth, getProductsByVendorCategories);
router.get("/product-by-vendor-subcategories/:vendorId", auth, getProductsByVendorSubcategories);
router.get("/previously-ordered/:category", auth,  getPreviouslyOrderedItemsByCategory);
router.get("/product-by-vendor-types/:vendorId", auth, getProductsByVendorTypes);
router.get("/product-by-home-chef-types/:homeChefId", auth, getProductsByHomeChefTypes);
router.get("/product-by-vendor/:vendorId", auth, getProductsByVendor);
router.get("/product-by-home-chef/:homeChefId", auth, getProductsByHomeChef);
router.get("/product-details/:id", auth, getProductDetails);
router.get("/:id", auth, getProductById);
module.exports = router;