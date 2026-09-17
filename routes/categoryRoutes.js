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
  deleteSubCategory,
  AllCategoriesWithoutSubCategories,
} = require("../controllers/categoryController");

// Category Routes
router.get("/", auth, getAllCategories);
router.post("/create", auth, createCategory);
router.put("/reorder", auth, reorderCategories);

// Sub-Category Routes
router.get("/all-categories", auth, AllCategoriesWithoutSubCategories);
router.get("/subcategories", auth, getAllSubCategories);
router.post("/create/subcategories", auth, createSubCategory);
router.put("/update/subcategories/:subId", auth, updateSubCategory);
router.delete("/delete/:id", auth, deleteCategory);
router.delete("/delete/subcategories/:subId", auth, deleteSubCategory);

router.get("/:categoryId/subcategories", auth, getSubCategoriesByCategory);
router.get("/subcategories/:subId", auth, getSubCategoryById);
router.put("/update/:id", auth, updateCategory);
router.get("/:id", auth, getCategoryById);
module.exports = router;