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
const upload = require("../middleware/upload");

// Category Routes
router.get("/", auth, getAllCategories);
router.post(
  "/create",
  upload.memoryUpload.fields([
    { name: "image", maxCount: 1 },
    { name: "icon", maxCount: 1 },
  ]),
  auth,
  createCategory,
);
router.put("/reorder", auth, reorderCategories);

// Sub-Category Routes
router.get("/all-categories", auth, AllCategoriesWithoutSubCategories);
router.get("/subcategories", auth, getAllSubCategories);
router.post(
  "/create/subcategories",
  upload.memoryUpload.fields([
    { name: "image", maxCount: 1 },
    { name: "icon", maxCount: 1 },
  ]),
  auth,
  createSubCategory,
);
router.put(
  "/update/subcategories/:subId",
  upload.memoryUpload.fields([
    { name: "image", maxCount: 1 },
    { name: "icon", maxCount: 1 },
  ]),
  auth,
  updateSubCategory,
);
router.delete("/delete/:id", auth, deleteCategory);
router.delete("/delete/subcategories/:subId", auth, deleteSubCategory);

router.get("/:categoryId/subcategories", auth, getSubCategoriesByCategory);
router.get("/subcategories/:subId", auth, getSubCategoryById);
router.put(
  "/update/:id",
  upload.memoryUpload.fields([
    { name: "image", maxCount: 1 },
    { name: "icon", maxCount: 1 },
  ]),
  auth,
  updateCategory,
);
router.get("/:id", auth, getCategoryById);
module.exports = router;
