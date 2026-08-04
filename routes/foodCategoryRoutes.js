const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/rolemiddleware");
const {
  getAllCategories,
  createCategory,
  reorderCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  getAllSubCategories,
  getSubCategoriesByCategory,
  getSubCategoryById,
  createSubCategory,
  updateSubCategory,
  deleteSubCategory
} = require("../controllers/foodCategoryController");

// Category Routes
router.get("/", auth, getAllCategories);
router.post("/create", auth, role("admin"), createCategory);
router.put("/reorder", auth, reorderCategories);

// Sub-Category Routes
router.get("/subcategories", auth, getAllSubCategories);
router.post("/create/subcategories", auth, role("admin"), createSubCategory);
router.get("/:categoryId/subcategories", auth, getSubCategoriesByCategory);
router.get("/subcategories/:subId", auth, getSubCategoryById);
router.put("/update/subcategories/:subId", auth, role("admin"), updateSubCategory);
router.delete("/delete/:id", auth, role("admin"), deleteCategory);
router.delete("/delete/subcategories/:subId", auth, role("admin"), deleteSubCategory);

router.put("/update/:id", auth, role("admin"), updateCategory);
router.get("/:id", auth, getCategoryById);
module.exports = router;