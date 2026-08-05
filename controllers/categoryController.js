const Category = require("../models/Category");
const SubCategory = require("../models/SubCategory");

// =====================================================
// CATEGORY APIs
// =====================================================

// Create Category
exports.addCategory = async (req, res) => {
    try {
        const { name, image, status } = req.body;
        const exists = await Category.findOne({ name });

        if (exists) {
            return res.status(400).json({
                success: false,
                message: "Category already exists",
            });
        }

        const category = await Category.create({
            name,
            image,
            status,
        });

        res.status(201).json({
            success: true,
            message: "Category added successfully",
            data: category,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message,
        });
    }
};

// Get All Categories
exports.getCategories = async (req, res) => {
    try {
        const categories = await Category.find().lean();

        const subCategories = await SubCategory.find();

        const response = categories.map((cat) => ({
            ...cat,
            subCategories: subCategories.filter(
                (sub) => sub.category.toString() === cat._id.toString()
            ),
        }));

        res.status(200).json({
            success: true,
            data: response,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message,
        });
    }
};

// Get Category By ID
exports.getCategoryById = async (req, res) => {
    try {
        const { id } = req.params;

        const category = await Category.findById(id);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: "Category not found",
            });
        }

        const subCategories = await SubCategory.find({
            category: id,
        });

        res.status(200).json({
            success: true,
            data: {
                ...category.toObject(),
                subCategories,
            },
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message,
        });
    }
};

// Update Category
exports.updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, image, status } = req.body;

        const category = await Category.findById(id);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: "Category not found",
            });
        }

        if (name) category.name = name;
        if (image) category.image = image;
        if (status) category.status = status;
      

        await category.save();

        res.status(200).json({
            success: true,
            message: "Category updated successfully",
            data: category,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message,
        });
    }
};

// Delete Category
exports.deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;

        const category = await Category.findById(id);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: "Category not found",
            });
        }

        await SubCategory.deleteMany({
            category: id,
        });

        await category.deleteOne();

        res.status(200).json({
            success: true,
            message: "Category deleted successfully",
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message,
        });
    }
};

// =====================================================
// SUB CATEGORY APIs
// =====================================================

// Create Sub Category
exports.addSubCategory = async (req, res) => {
    try {
        const { categoryId, name, image, status } = req.body;
        const category = await Category.findById(categoryId);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: "Category not found",
            });
        }

        const exists = await SubCategory.findOne({
            category: categoryId,
            name,
        });

        if (exists) {
            return res.status(400).json({
                success: false,
                message: "Sub Category already exists",
            });
        }

        const subCategory = await SubCategory.create({
            category: categoryId,
            name,
            image,
            status,
        });

        res.status(201).json({
            success: true,
            message: "Sub Category added successfully",
            data: subCategory,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message,
        });
    }
};

// Get All Sub Categories
exports.getAllSubCategories = async (req, res) => {
    try {
        const subCategories = await SubCategory.find().populate(
            "category",
            "name image"
        );

        res.status(200).json({
            success: true,
            data: subCategories,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message,
        });
    }
};

// Update Sub Category
exports.updateSubCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { categoryId, name, image, status, isActive } = req.body;
        const subCategory = await SubCategory.findById(id);

        if (!subCategory) {
            return res.status(404).json({
                success: false,
                message: "Sub Category not found",
            });
        }

        if (categoryId) {
            const category = await Category.findById(categoryId);

            if (!category) {
                return res.status(404).json({
                    success: false,
                    message: "Category not found",
                });
            }

            subCategory.category = categoryId;
        }

        if (name) subCategory.name = name;
        if (image) subCategory.image = image;
        if (status) subCategory.status = status;
        

        await subCategory.save();

        res.status(200).json({
            success: true,
            message: "Sub Category updated successfully",
            data: subCategory,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message,
        });
    }
};

// Delete Sub Category
exports.deleteSubCategory = async (req, res) => {
    try {
        const { id } = req.params;

        const subCategory = await SubCategory.findById(id);

        if (!subCategory) {
            return res.status(404).json({
                success: false,
                message: "Sub Category not found",
            });
        }

        await subCategory.deleteOne();

        res.status(200).json({
            success: true,
            message: "Sub Category deleted successfully",
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message,
        });
    }
};

// =====================================================
// Get Sub Categories By Category ID
// =====================================================

exports.getSubCategoriesByCategoryId = async (req, res) => {
    try {
        const { categoryId } = req.params;

        const subCategories = await SubCategory.find({
            category: categoryId,
        }).sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            message: "Sub Categories fetched successfully",
            total: subCategories.length,
            data: subCategories,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// =====================================================
// Get Sub Category By ID
// =====================================================

// =====================================================
// Get Sub Category By ID
// =====================================================

exports.getSubCategoryById = async (req, res) => {
    try {
        const { id } = req.params;

        const subCategory = await SubCategory.findById(id).select("-category");

        if (!subCategory) {
            return res.status(404).json({
                success: false,
                message: "Sub Category not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Sub Category fetched successfully",
            data: subCategory,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};