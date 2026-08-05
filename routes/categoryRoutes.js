const express = require("express");
const router = express.Router();

const {
  addCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,

  addSubCategory,
  getAllSubCategories,
  getSubCategoryById,
  getSubCategoriesByCategoryId,
  updateSubCategory,
  deleteSubCategory,
} = require("../controllers/categoryController");

// Category
router.post("/category", addCategory);
router.get("/categories", getCategories);
router.get("/category/:id", getCategoryById);
router.put("/category/:id", updateCategory);
router.delete("/category/:id", deleteCategory);

// Sub Category
router.post("/subcategory", addSubCategory);
router.get("/subcategories", getAllSubCategories);
router.get("/subcategory/category/:categoryId", getSubCategoriesByCategoryId);
router.get("/subcategory/:id", getSubCategoryById);
router.put("/subcategory/:id", updateSubCategory);
router.delete("/subcategory/:id", deleteSubCategory);

module.exports = router;