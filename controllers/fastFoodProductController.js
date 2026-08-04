const FastFoodProduct = require("../models/FastFoodProduct");
const Restaurant = require("../models/Restaurant");
const RestaurantCategory = require("../models/RestaurantCategory");
const RestaurantSubCategory = require("../models/RestaurantSubCategory");


// =====================================
// CREATE PRODUCT
// =====================================

exports.createProduct = async (req, res) => {
    try {
        const {
            restaurantId,
            categoryId,
            subCategoryId,
            name,
            description,
            image,
            gallery,
            price,
            discountPrice,
            status,
            preparationTime,
            ingredients,
            calories,
            isVeg,
            isFeatured,
            isPopular,
            isRecommended,
            isAvailable,
        } = req.body;

        // Required Fields Validation
        if (!restaurantId) {
            return res.status(400).json({
                success: false,
                message: "Restaurant is required",
            });
        }

        if (!categoryId) {
            return res.status(400).json({
                success: false,
                message: "Category is required",
            });
        }

        if (!subCategoryId) {
            return res.status(400).json({
                success: false,
                message: "Sub Category is required",
            });
        }

        if (!name) {
            return res.status(400).json({
                success: false,
                message: "Product name is required",
            });
        }

        if (!price) {
            return res.status(400).json({
                success: false,
                message: "Price is required",
            });
        }

        // Check Restaurant
        const restaurant = await Restaurant.findById(restaurantId);

        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: "Restaurant not found",
            });
        }

        // Check Restaurant Category
        const category = await RestaurantCategory.findOne({
            _id: categoryId,
            restaurantId,
        });

        if (!category) {
            return res.status(404).json({
                success: false,
                message: "Category not found for this restaurant",
            });
        }

        // Check Restaurant Sub Category
        const subCategory = await RestaurantSubCategory.findOne({
            _id: subCategoryId,
            categoryId,
            restaurantId,
        });

        if (!subCategory) {
            return res.status(404).json({
                success: false,
                message: "Sub Category not found for this restaurant",
            });
        }

        // Duplicate Product Check
        const exists = await FastFoodProduct.findOne({
            restaurantId,
            name: name.trim(),
        });

        if (exists) {
            return res.status(400).json({
                success: false,
                message: "Product already exists",
            });
        }

        // Create Product
        const product = await FastFoodProduct.create({
            restaurantId,
            categoryId,
            subCategoryId,
            name: name.trim(),
            description,
            image,
            gallery: gallery || [],
            price,
            discountPrice,
            status,
            preparationTime,
            ingredients: ingredients || [],
            calories,
            isVeg,
            isFeatured,
            isPopular,
            isRecommended,
            isAvailable,
        });

        return res.status(201).json({
            success: true,
            message: "Product created successfully",
            product,
        });

    } catch (err) {
        console.log("CREATE PRODUCT ERROR:", err);

        return res.status(500).json({
            success: false,
            message: err.message,
        });
    }
};

// =====================================
// GET ALL PRODUCTS
// =====================================

exports.getAllProducts = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            search,
            status,
            sortBy = "createdAt",
            sortOrder = "desc",
        } = req.query;

        const query = {};

        if (status) query.status = status;

        if (search) {
            query.name = {
                $regex: search,
                $options: "i",
            };
        }

        const pageNum = Math.max(parseInt(page), 1);
        const limitNum = Math.max(parseInt(limit), 1);

        const skip = (pageNum - 1) * limitNum;

        const sort = {
            [sortBy]: sortOrder === "asc" ? 1 : -1,
        };

        const [products, total] = await Promise.all([
            FastFoodProduct.find(query)
                .populate("restaurantId", "_id name logo")
                .populate("categoryId", "_id name image status")
                .populate("subCategoryId", "_id name image status")
                .sort(sort)
                .skip(skip)
                .limit(limitNum),

            FastFoodProduct.countDocuments(query),
        ]);

        return res.status(200).json({
            success: true,
            count: products.length,
            total,
            page: pageNum,
            totalPages: Math.ceil(total / limitNum),
            products,
        });
    } catch (err) {
        console.log(err);

        return res.status(500).json({
            success: false,
            message: err.message,
        });
    }
};

// =====================================
// GET PRODUCT DETAILS
// =====================================

exports.getProductDetails = async (req, res) => {
    try {
        const product = await FastFoodProduct.findById(req.params.id)
            .populate("restaurantId", "name logo coverImage")
            .populate("categoryId", "name image")
            .populate("subCategoryId", "name image");

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found",
            });
        }

        return res.status(200).json({
            success: true,
            product,
        });
    } catch (err) {
        console.log("GET PRODUCT DETAILS ERROR:", err);

        return res.status(500).json({
            success: false,
            message: err.message,
        });
    }
};

// =====================================
// UPDATE PRODUCT
// =====================================

exports.updateProduct = async (req, res) => {
    try {
        const product = await FastFoodProduct.findById(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found",
            });
        }

        const fields = [
            "restaurantId",
            "categoryId",
            "subCategoryId",
            "name",
            "description",
            "image",
            "gallery",
            "price",
            "discountPrice",
            "status",
            "preparationTime",
            "ingredients",
            "calories",
            "isVeg",
            "isFeatured",
            "isPopular",
            "isRecommended",
            "isAvailable",
        ];

        fields.forEach((field) => {
            if (req.body[field] !== undefined) {
                product[field] = req.body[field];
            }
        });

        await product.save();

        return res.status(200).json({
            success: true,
            message: "Product updated successfully",
            product,
        });
    } catch (err) {
        console.log("UPDATE PRODUCT ERROR:", err);

        return res.status(500).json({
            success: false,
            message: err.message,
        });
    }
};

// =====================================
// DELETE PRODUCT
// =====================================

exports.deleteProduct = async (req, res) => {
    try {
        const product = await FastFoodProduct.findByIdAndDelete(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Product deleted successfully",
        });
    } catch (err) {
        console.log("DELETE PRODUCT ERROR:", err);

        return res.status(500).json({
            success: false,
            message: err.message,
        });
    }
};

// =====================================
// SEARCH PRODUCTS
// =====================================

exports.searchProducts = async (req, res) => {
    try {
        const { keyword } = req.query;

        if (!keyword) {
            return res.status(400).json({
                success: false,
                message: "Search keyword is required",
            });
        }

        const products = await FastFoodProduct.find({
            name: {
                $regex: keyword,
                $options: "i",
            },
        })
            .populate("restaurantId", "name logo")
            .populate("categoryId", "name")
            .populate("subCategoryId", "name");

        return res.status(200).json({
            success: true,
            count: products.length,
            products,
        });
    } catch (err) {
        console.log("SEARCH PRODUCTS ERROR:", err);

        return res.status(500).json({
            success: false,
            message: err.message,
        });
    }
};

// =====================================
// GET PRODUCTS BY RESTAURANT
// =====================================

exports.getProductsByRestaurant = async (req, res) => {
    try {
        const { restaurantId } = req.params;

        const restaurant = await Restaurant.findById(restaurantId);

        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: "Restaurant not found",
            });
        }

        const products = await FastFoodProduct.find({
            restaurantId,
        })
            .populate("categoryId", "name")
            .populate("subCategoryId", "name")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: products.length,
            restaurant: {
                _id: restaurant._id,
                name: restaurant.name,
                logo: restaurant.logo,
            },
            products,
        });
    } catch (err) {
        console.log("GET PRODUCTS BY RESTAURANT ERROR:", err);

        return res.status(500).json({
            success: false,
            message: err.message,
        });
    }
};

// =====================================
// GET PRODUCTS BY CATEGORY
// =====================================

exports.getProductsByCategory = async (req, res) => {
    try {
        const { categoryId } = req.params;

        const products = await FastFoodProduct.find({
            categoryId,
            isAvailable: true,
        })
            .populate("restaurantId", "name logo")
            .populate("categoryId", "name image")
            .populate("subCategoryId", "name image")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: products.length,
            products,
        });
    } catch (err) {
        console.log("GET PRODUCTS BY CATEGORY ERROR:", err);

        return res.status(500).json({
            success: false,
            message: err.message,
        });
    }
};

// =====================================
// GET PRODUCTS BY SUB CATEGORY
// =====================================

exports.getProductsBySubCategory = async (req, res) => {
    try {
        const { subCategoryId } = req.params;

        const products = await FastFoodProduct.find({
            subCategoryId,
            isAvailable: true,
        })
            .populate("restaurantId", "name logo")
            .populate("categoryId", "name image")
            .populate("subCategoryId", "name image")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: products.length,
            products,
        });
    } catch (err) {
        console.log("GET PRODUCTS BY SUB CATEGORY ERROR:", err);

        return res.status(500).json({
            success: false,
            message: err.message,
        });
    }
};

// =====================================
// GET FEATURED PRODUCTS
// =====================================

exports.getFeaturedProducts = async (req, res) => {
    try {
        const products = await FastFoodProduct.find({
            isFeatured: true,
            isAvailable: true,
        })
            .populate("restaurantId", "name logo")
            .populate("categoryId", "name")
            .populate("subCategoryId", "name")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: products.length,
            products,
        });
    } catch (err) {
        console.log("GET FEATURED PRODUCTS ERROR:", err);

        return res.status(500).json({
            success: false,
            message: err.message,
        });
    }
};

// =====================================
// GET POPULAR PRODUCTS
// =====================================

exports.getPopularProducts = async (req, res) => {
    try {
        const products = await FastFoodProduct.find({
            isPopular: true,
            isAvailable: true,
        })
            .populate("restaurantId", "name logo")
            .populate("categoryId", "name")
            .populate("subCategoryId", "name")
            .sort({ sold: -1 });

        return res.status(200).json({
            success: true,
            count: products.length,
            products,
        });
    } catch (err) {
        console.log("GET POPULAR PRODUCTS ERROR:", err);

        return res.status(500).json({
            success: false,
            message: err.message,
        });
    }
};

// =====================================
// GET RECOMMENDED PRODUCTS
// =====================================

exports.getRecommendedProducts = async (req, res) => {
    try {
        const products = await FastFoodProduct.find({
            isRecommended: true,
            isAvailable: true,
        })
            .populate("restaurantId", "name logo")
            .populate("categoryId", "name")
            .populate("subCategoryId", "name")
            .sort({ rating: -1 });

        return res.status(200).json({
            success: true,
            count: products.length,
            products,
        });
    } catch (err) {
        console.log("GET RECOMMENDED PRODUCTS ERROR:", err);

        return res.status(500).json({
            success: false,
            message: err.message,
        });
    }
};