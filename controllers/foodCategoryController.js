const FoodCategory = require("../models/FoodCategories");

// Helper to broadcast socket events safely
const emitSocketEvent = (req, event, payload) => {
  const io = req.app.get("io");
  if (io) io.emit(event, payload);
};

// ==========================================
// CATEGORY CONTROLLERS
// ==========================================

exports.getAllCategories = async (req, res) => {
  try {
    const categories = await FoodCategory.find().sort({ sortOrder: 1, createdAt: -1 });
    res.status(200).json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getCategoryById = async (req, res) => {
  try {
    const category = await FoodCategory.findById(req.params.id);
    if (!category) return res.status(404).json({ success: false, message: "Category not found" });
    res.status(200).json({ success: true, data: category });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const category = new FoodCategory(req.body);
    await category.save();
    emitSocketEvent(req, "category:created", category);
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const category = await FoodCategory.findById(req.params.id);
    if (!category) return res.status(404).json({ success: false, message: "Category not found" });

    Object.assign(category, req.body);
    await category.save();
    emitSocketEvent(req, "category:updated", category);
    res.status(200).json({ success: true, data: category });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const category = await FoodCategory.findByIdAndDelete(req.params.id);
    if (!category) return res.status(404).json({ success: false, message: "Category not found" });
    emitSocketEvent(req, "category:deleted", { id: req.params.id });
    res.status(200).json({ success: true, message: "Category deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.reorderCategories = async (req, res) => {
  try {
    const { orderedIds } = req.body; // Array of IDs in new order
    const bulkOps = orderedIds.map((id, index) => ({
      updateOne: {
        filter: { _id: id },
        update: { sortOrder: index },
      },
    }));
    await FoodCategory.bulkWrite(bulkOps);
    emitSocketEvent(req, "categories:reordered", { orderedIds });
    res.status(200).json({ success: true, message: "Categories reordered successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// SUB-CATEGORY CONTROLLERS
// ==========================================

exports.getAllSubCategories = async (req, res) => {
  try {
    const categories = await FoodCategory.find({}, "subCategories categoryName");
    const allSubCategories = categories.flatMap((cat) =>
      cat.subCategories.map((sub) => ({
        ...sub.toObject(),
        parentCategoryId: cat._id,
        parentCategoryName: cat.categoryName,
      }))
    );
    res.status(200).json({ success: true, data: allSubCategories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getSubCategoriesByCategory = async (req, res) => {
  try {
    const category = await FoodCategory.findById(req.params.categoryId);
    if (!category) return res.status(404).json({ success: false, message: "Category not found" });
    res.status(200).json({ success: true, data: category.subCategories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getSubCategoryById = async (req, res) => {
  try {
    const category = await FoodCategory.findOne(
      { "subCategories._id": req.params.subId },
      { "subCategories.$": 1, categoryName: 1 }
    );
    if (!category || !category.subCategories.length) {
      return res.status(404).json({ success: false, message: "Sub-category not found" });
    }
    res.status(200).json({ success: true, data: category.subCategories[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createSubCategory = async (req, res) => {
  try {
    const { categoryId, ...subData } = req.body;
    const category = await FoodCategory.findById(categoryId);
    if (!category) return res.status(404).json({ success: false, message: "Parent Category not found" });

    category.subCategories.push(subData);
    await category.save();
    const createdSub = category.subCategories[category.subCategories.length - 1];

    emitSocketEvent(req, "subcategory:created", { categoryId, subCategory: createdSub });
    res.status(201).json({ success: true, data: createdSub });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.updateSubCategory = async (req, res) => {
  try {
    const { subId } = req.params;
    const category = await FoodCategory.findOne({ "subCategories._id": subId });
    if (!category) return res.status(404).json({ success: false, message: "Sub-category not found" });

    const sub = category.subCategories.id(subId);
    Object.assign(sub, req.body);
    await category.save();

    emitSocketEvent(req, "subcategory:updated", { categoryId: category._id, subCategory: sub });
    res.status(200).json({ success: true, data: sub });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.deleteSubCategory = async (req, res) => {
  try {
    const { subId } = req.params;
    const category = await FoodCategory.findOne({ "subCategories._id": subId });
    if (!category) return res.status(404).json({ success: false, message: "Sub-category not found" });

    category.subCategories.pull(subId);
    await category.save();

    emitSocketEvent(req, "subcategory:deleted", { categoryId: category._id, subId });
    res.status(200).json({ success: true, message: "Sub-category deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};