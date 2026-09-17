const Order = require("../models/Order");
const Product = require("../models/Product");
const Restaurant = require("../models/Restaurant");
const FoodCategory = require("../models/FoodCategories");
const HomeChef = require("../models/HomeChef");
const { default: mongoose } = require("mongoose");
const Vendor = require("../models/Vendor");
const FoodCategories = require("../models/FoodCategories");
const Campaign = require("../models/Campaign");

// exports.createProduct = async (req, res) => {
//   try {
//     const {
//       name,
//       description,
//       images,
//       weight,
//       quantity,
//       belongsTo,
//       vendorId,
//       category,
//       subcategory,
//       price,
//       discountPrice,
//       variations,
//       serving,
//       addOns,
//       isVeg,
//       tags,
//       isAvailable,
//       preparationTime,
//       rating,
//       isFavourite,
//       likes,
//       status,
//       type,
//     } = req.body;

//     // 1. Mandatory Input Validations
//     if (!name) {
//       return res.status(400).json({
//         success: false,
//         message: "Product name is required",
//       });
//     }

//     if (!vendorId) {
//       return res.status(400).json({
//         success: false,
//         message: "vendorId is required",
//       });
//     }

//     if (price === undefined || price === null) {
//       return res.status(400).json({
//         success: false,
//         message: "Price is required",
//       });
//     }

//     if (!category) {
//       return res.status(400).json({
//         success: false,
//         message: "Category is required",
//       });
//     }

//     // 2. Validate Vendor existence in DB
//     const vendor = await Vendor.findById(vendorId);
//     if (!vendor) {
//       return res.status(404).json({
//         success: false,
//         message: "Vendor account not found",
//       });
//     }

//     // 3. Create Product with all mapped fields
//     const product = await Product.create({
//       name,
//       description,
//       images: Array.isArray(images) ? images : [],
//       weight,
//       quantity,
//       belongsTo,
//       vendorId,
//       category,
//       subcategory,
//       price,
//       discountPrice: discountPrice || null,
//       variations: Array.isArray(variations) ? variations : [],
//       serving,
//       addOns: Array.isArray(addOns) ? addOns : [],
//       isVeg: isVeg ?? true,
//       tags: Array.isArray(tags) ? tags : [],
//       isAvailable: isAvailable ?? true,
//       isFavourite: isFavourite ?? false,
//       preparationTime,
//       rating: rating || 0,
//       status: status || "active",
//       type,
//       likes: Array.isArray(likes) ? likes : [],
//     });

//     // 4. Trigger Real-time Socket IO Notifications
//     const io = req.app.get("io");

//     if (io) {
//       // Emit to the specific Vendor's active socket room
//       io.to(`vendor:${vendorId}`).emit("vendorProductCreated", {
//         vendorId,
//         product,
//         message: "New product successfully added to your catalog",
//       });

//       // Broadcast to Customers listening for live vendor menu updates
//       io.to(`vendorCatalog:${vendorId}`).emit("menuCatalogUpdated", {
//         vendorId,
//         action: "ADD_PRODUCT",
//         product,
//       });
//     }

//     return res.status(201).json({
//       success: true,
//       message: "Product created successfully",
//       product,
//     });
//   } catch (err) {
//     console.error("CREATE PRODUCT ERROR:", err);

//     return res.status(500).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };

exports.createProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      images,
      weight,
      quantity,
      belongsTo,
      vendorId,
      category,
      subcategory,
      price,
      discountPrice,
      variations,
      serving,
      addOns,
      isVeg,
      tags,
      isAvailable,
      preparationTime,
      rating,
      isFavourite,
      likes,
      status,
      type,
    } = req.body;

    // 1. Mandatory Input Validations
    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Product name is required",
      });
    }

    if (!vendorId) {
      return res.status(400).json({
        success: false,
        message: "vendorId is required",
      });
    }

    if (price === undefined || price === null) {
      return res.status(400).json({
        success: false,
        message: "Price is required",
      });
    }

    if (!category) {
      return res.status(400).json({
        success: false,
        message: "Category is required",
      });
    }

    // 2. Validate Vendor existence in DB
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor account not found",
      });
    }

    // 3. Normalize Product Images (Supports Multer Single File, Multiple Files & JSON URLs)
    let productImages = [];

    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      // Multiple files uploaded via multer (e.g. req.files)
      productImages = req.files.map(
        (file) => file.path || file.location || file.filename,
      );
    } else if (req.file) {
      // Single file uploaded via multer (e.g. req.file)
      productImages = [req.file.path || req.file.location || req.file.filename];
    } else if (images) {
      // JSON array or string URL passed in body
      if (typeof images === "string") {
        try {
          productImages = JSON.parse(images);
        } catch {
          productImages = [images];
        }
      } else if (Array.isArray(images)) {
        productImages = images;
      }
    }

    // 4. Dynamic Subcategory Auto-Creation Logic
    if (subcategory && subcategory.trim() !== "") {
      const trimmedSubCategory = subcategory.trim();

      const foodCategoryDoc = await FoodCategories.findOne({
        $or: [
          { categoryName: { $regex: new RegExp(`^${category.trim()}$`, "i") } },
          { categorySlug: category.toLowerCase().trim() },
        ],
      });

      if (foodCategoryDoc) {
        // Check if subcategory already exists under this parent category
        const subExists = foodCategoryDoc.subCategories.some(
          (sub) => sub.name.toLowerCase() === trimmedSubCategory.toLowerCase(),
        );

        // If subcategory does NOT exist, create it with product image
        if (!subExists) {
          // Select 1st uploaded image file or URL for subcategory image
          const subCategoryImage =
            productImages.length > 0
              ? productImages[0]
              : "https://example.com/default-subcategory.jpg";

          foodCategoryDoc.subCategories.push({
            name: trimmedSubCategory,
            image: subCategoryImage,
            status: "active",
          });

          // Triggers pre-save hook for slug auto-generation
          await foodCategoryDoc.save();
        }
      }
    }

    // 5. Create Product in DB
    const product = await Product.create({
      name,
      description,
      images: productImages,
      weight,
      quantity,
      belongsTo,
      vendorId,
      category,
      subcategory,
      price,
      discountPrice: discountPrice || null,
      variations:
        typeof variations === "string"
          ? JSON.parse(variations)
          : Array.isArray(variations)
            ? variations
            : [],
      serving,
      addOns:
        typeof addOns === "string"
          ? JSON.parse(addOns)
          : Array.isArray(addOns)
            ? addOns
            : [],
      isVeg: isVeg ?? true,
      tags:
        typeof tags === "string"
          ? JSON.parse(tags)
          : Array.isArray(tags)
            ? tags
            : [],
      isAvailable: isAvailable ?? true,
      isFavourite: isFavourite ?? false,
      preparationTime,
      rating: rating || 0,
      status: status || "active",
      type,
      likes: Array.isArray(likes) ? likes : [],
    });

    // 6. Trigger Real-time Socket IO Notifications
    const io = req.app.get("io");

    if (io) {
      io.to(`vendor:${vendorId}`).emit("vendorProductCreated", {
        vendorId,
        product,
        message: "New product successfully added to your catalog",
      });

      io.to(`vendorCatalog:${vendorId}`).emit("menuCatalogUpdated", {
        vendorId,
        action: "ADD_PRODUCT",
        product,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      product,
    });
  } catch (err) {
    console.error("CREATE PRODUCT ERROR:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// =====================================
// GET ALL PRODUCTS (filter, search, paginate)
// =====================================
exports.getAllProducts = async (req, res) => {
  try {
    const {
      vendorId,
      category,
      subcategory,
      status,
      type,
      isAvailable,
      search,
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const query = {};

    // Vendor and category filtering
    if (vendorId) query.vendorId = vendorId;
    if (category) query.category = category;
    if (subcategory) query.subcategory = subcategory;
    if (type) query.type = type;
    if (status && status !== "all") query.status = status;

    if (isAvailable !== undefined) {
      query.isAvailable = isAvailable === "true" || isAvailable === true;
    }

    // Search filter across name, category, and tags
    if (search) {
      const regex = new RegExp(search, "i");
      query.$or = [{ name: regex }, { category: regex }, { tags: regex }];
    }

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.max(parseInt(limit, 10) || 20, 1);
    const skip = (pageNum - 1) * limitNum;
    const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

    // Execute query with Vendor population
    const [products, total] = await Promise.all([
      Product.find(query)
        .populate("vendorId", "name logo status address phone storeType")
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Product.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      count: products.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      products,
    });
  } catch (err) {
    console.error("GET PRODUCTS ERROR:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// =====================================
// GET OMNIGO MART PRODUCTS
// =====================================
exports.getOmnigoMartProducts = async (req, res) => {
  try {
    const {
      category,
      status,
      type,
      isAvailable,
      search,
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const query = {};

    // Filter by allowed Omnigo Mart types (grocery, pharmacy, stationary)
    // If a specific type parameter is passed, use it; otherwise, query all three
    if (type) {
      query.belongsTo = type;
    } else {
      query.belongsTo = { $in: ["grocery", "pharmacy", "stationary"] };
    }

    if (category) query.category = category;
    if (status && status !== "all") query.status = status;
    if (isAvailable !== undefined) query.isAvailable = isAvailable === "true";

    if (search) {
      const regex = new RegExp(search, "i");
      query.$or = [{ name: regex }, { category: regex }, { tags: regex }];
    }

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.max(parseInt(limit, 10) || 20, 1);
    const skip = (pageNum - 1) * limitNum;
    const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

    const [products, total] = await Promise.all([
      Product.find(query)
        // .populate("restaurantId", "name logo status type")
        .sort(sort)
        .skip(skip)
        .limit(limitNum),
      Product.countDocuments(query),
    ]);

    const formattedProducts = products.map((item) => ({
      id: item._id,
      name: item.name,
      weight: item.weight,
      image: item.image,
      description: item.description,
      price: item.price,
      quantity: item.quantity,
      category: item.category,
      likes: item.likes.length,
      createdAt: item.createdAt,
    }));

    return res.status(200).json({
      success: true,
      count: products.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      products: formattedProducts,
    });
  } catch (err) {
    console.error("GET PRODUCTS ERROR:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// =====================================
// GET OMNIGO MART PRODUCTS CATEGORIES
// =====================================
exports.getOmnigoMartProductsCategries = async (req, res) => {
  try {
    const {
      category,
      status,
      type,
      isAvailable,
      search,
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const query = {};

    // Filter by allowed Omnigo Mart types (grocery, pharmacy, stationary)
    // If a specific type parameter is passed, use it; otherwise, query all three
    if (type) {
      query.belongsTo = type;
    } else {
      query.belongsTo = { $in: ["grocery", "pharmacy", "stationary"] };
    }

    if (category) query.category = category;
    if (status && status !== "all") query.status = status;
    if (isAvailable !== undefined) query.isAvailable = isAvailable === "true";

    if (search) {
      const regex = new RegExp(search, "i");
      query.$or = [{ name: regex }, { category: regex }, { tags: regex }];
    }

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.max(parseInt(limit, 10) || 20, 1);
    const skip = (pageNum - 1) * limitNum;
    const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

    const [products, total] = await Promise.all([
      Product.find(query)
        // .populate("restaurantId", "name logo status type")
        // .select("category"),
        .sort(sort)
        .skip(skip)
        .limit(limitNum),
      Product.countDocuments(query),
    ]);

    const formattedProducts = products.map((item) => ({
      id: item._id,
      name: item.name,
      weight: item.weight,
      image: item.image,
      description: item.description,
      price: item.price,
      quantity: item.quantity,
      category: item.category,
      likes: item.likes.length,
      createdAt: item.createdAt,
    }));

    return res.status(200).json({
      success: true,
      count: products.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      products: formattedProducts,
    });
  } catch (err) {
    console.error("GET PRODUCTS ERROR:", err);

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
    const { category, subcategory, search } = req.query;

    // const query = {};

   const query = {
      vendorId: { $exists: true, $ne: null },
    };

    // Helper to build a case-insensitive regex pattern handling spaces/dashes (e.g. "fast food" or "fast-food")
    const createFlexibleRegex = (input) => {
      if (!input) return null;
      // Convert hyphens/multiple spaces to a flexible whitespace pattern
      const sanitized = input
        .trim()
        .toLowerCase()
        .replace(/[-_\s]+/g, "[-\\s_]*");
      return new RegExp(`^${sanitized}$`, "i");
    };

    if (category) {
      query.category = createFlexibleRegex(category);
    }

    if (subcategory) {
      query.subcategory = createFlexibleRegex(subcategory);
    }

    if (search) {
      const regex = new RegExp(search, "i");
      query.$or = [{ name: regex }, { category: regex }, { tags: regex }];
    }

    // 1. Query products matching category/subcategory
    const products = await Product.find(query).select(
      "name images price tags discountPrice category subcategory rating isAvailable isFavourite vendorId belongsTo chefId",
    );

    // 2. Extract restaurant IDs safely
    const vendorIds = products.map((p) => p.vendorId).filter(Boolean);

    // 3. Query associated restaurants
    const vendors = await Vendor.find({
      _id: { $in: vendorIds },
    }).select("_id businessName logo");

    // 4. Map restaurant data into product objects
    const vendorMap = new Map(vendors.map((r) => [r._id.toString(), r]));

    const productsWithVendor = products.map((productDoc) => {
      const product = productDoc.toObject();
      const vendor = product.vendorId
        ? vendorMap.get(product.vendorId.toString())
        : null;

      return {
        ...product,
        vendor: vendors || null,
      };
    });

    return res.status(200).json({
      success: true,
      count: productsWithVendor.length,
      data: productsWithVendor,
    });
  } catch (err) {
    console.error("GET PRODUCTS ERROR:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// =====================================
// GET PRODUCTS BY TYPE (popular, featured, new)
// =====================================
exports.getProductsByType = async (req, res) => {
  try {
    const { type } = req.query;

    // 1. Strict Query: Sirf wohi products layen jin me vendorId present aur non-null ho
    const query = {
      vendorId: { $exists: true, $ne: null },
    };

    if (type) query.type = type.toLowerCase();

    // 2. Fetch products & populate vendorId
    const products = await Product.find(query)
      .populate("vendorId", "businessName logo deliveryTime")
      .select(
        "name images price discountPrice rating vendorId homeChefId belongsTo type isFavourite",
      );

    // 3. Map through products and filter out invalid/deleted sellers
    const formattedProducts = products
      .map((product) => {
        const seller = product.vendorId || product.homeChefId;

        // Agar DB me vendorId id attach thi par vendor document delete ho chuka ho
        if (!seller || !seller._id) return null;

        return {
          _id: product._id,
          name: product.name,
          images: product.images,
          price: product.price,
          discountPrice: product.discountPrice,
          rating: product.rating,
          type: product.type,
          vendor: {
            _id: seller._id,
            name: seller.businessName,
            logo: seller.logo,
            deliveryTime: seller.deliveryTime,
          },
        };
      })
      .filter(Boolean); // Null items ko array se drop kar dega

    return res.status(200).json({
      success: true,
      count: formattedProducts.length,
      data: formattedProducts,
    });
  } catch (err) {
    console.log("GET PRODUCTS ERROR:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// =====================================
// GET PRODUCTS BY VENDOR
// =====================================
exports.getProductsByVendor = async (req, res) => {
  try {
    const { vendorId } = req.params;

    if (!vendorId) {
      return res.status(400).json({
        success: false,
        message: "vendorId is required",
      });
    }

    const vendor = await Vendor.findById({ _id: vendorId });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    const products = await Product.find({ vendorId });

    return res.status(200).json({
      success: true,
      count: products.length,
      products,
    });
  } catch (err) {
    console.log("GET PRODUCTS ERROR:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// =====================================
// GET PRODUCTS BY VENDOR
// =====================================
exports.getProductsByHomeChef = async (req, res) => {
  try {
    const { homeChefId } = req.params;

    if (!homeChefId) {
      return res.status(400).json({
        success: false,
        message: "homeChefId is required",
      });
    }

    const homeChef = await Vendor.findById({ _id: homeChefId });

    if (!homeChef) {
      return res.status(404).json({
        success: false,
        message: "Home Chef not found",
      });
    }

    const products = await Product.find({ vendorId: homeChefId });

    return res.status(200).json({
      success: true,
      count: products.length,
      products,
    });
  } catch (err) {
    console.log("GET PRODUCTS ERROR:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// =====================================
// GET PRODUCTS BY VENDOR'S CATEGORIES
// =====================================
exports.getProductsByVendorCategories = async (req, res) => {
  try {
    const { categoryName } = req.query;
    const { vendorId } = req.params;

    if (!vendorId || !mongoose.Types.ObjectId.isValid(vendorId)) {
      return res.status(400).json({
        success: false,
        message: "Valid vendorId is required",
      });
    }

    const vendor = await Vendor.findById({ _id: vendorId }).lean();
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    const query = { vendorId };

    if (categoryName && categoryName.trim() !== "") {
      // Convert query string into target slug format: "fries-and-pasta"
      const slugifiedCategory = categoryName
        .trim()
        .toLowerCase()
        .replace(/&/g, "and") // Convert "&" to "and"
        .replace(/[\s_]+/g, "-") // Convert spaces and underscores to hyphens
        .replace(/-+/g, "-"); // Normalize multiple hyphens to a single hyphen

      query.category = slugifiedCategory;
    }

    const products = await Product.find(query)
      .select("name images price description category")
      .lean();

    return res.status(200).json({
      success: true,
      count: products.length,
      products,
    });
  } catch (err) {
    console.error("GET PRODUCTS ERROR:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// exports.getProductsByVendorCategories = async (req, res) => {
//   try {
//     const { categoryName } = req.query;
//     const { vendorId } = req.params;

//     if (!vendorId || !mongoose.Types.ObjectId.isValid(vendorId)) {
//       return res.status(400).json({
//         success: false,
//         message: "Valid vendorId is required",
//       });
//     }

//     const vendorObjectId = new mongoose.Types.ObjectId(vendorId);
//     let responseData = [];

//     if (categoryName && categoryName.trim() !== "") {
//       const formattedCategory = categoryName.trim().toLowerCase();

//       // 1. Special Types (popular, featured, new)
//       if (["popular items", "popular", "featured items", "featured", "new items", "new"].includes(formattedCategory)) {
//         let typeValue = "popular";
//         if (formattedCategory.includes("featured")) typeValue = "featured";
//         if (formattedCategory.includes("new")) typeValue = "new";

//         responseData = await Product.find({
//           vendorId: vendorObjectId,
//           type: typeValue,
//         })
//           .select("name images price description category type isFavourite isAvailable rating")
//           .lean();
//       } 
      
//       // 2. Deals / Combos Fetching
//       else if (["deals", "combos", "deal", "combo"].includes(formattedCategory)) {
//         const deals = await Deal.find({
//           vendorId: vendorObjectId,
//           isActive: true,
//         }).lean();

//         // Standardize output for Deals
//         responseData = deals.map((d) => ({
//           _id: d._id,
//           name: d.title,
//           image: d.image,
//           originalPrice: d.originalPrice,
//           price: d.discountPrice,
//           dealType: d.dealType,
//           isDeal: true,
//         }));
//       } 

//       // 3. Campaigns / Offers Fetching
//       else if (["campaigns", "offers", "campaign", "offer"].includes(formattedCategory)) {
//         const campaigns = await Campaign.find({
//           vendorId: vendorObjectId,
//           isActive: true,
//         }).lean();

//         // Standardize output for Campaigns
//         responseData = campaigns.map((c) => ({
//           _id: c._id,
//           name: c.campaignName,
//           description: c.description,
//           banner: c.campaignBanner,
//           campaignType: c.campaignType,
//           offerDetails: c.offerDetails,
//           applicableProducts: c.applicableProducts,
//           isCampaign: true,
//         }));
//       } 

//       // 4. Standard Categories (Fallback e.g., "fast-food", "chinese", "burgers")
//       else {
//         const slugified = formattedCategory
//           .replace(/&/g, "and")
//           .replace(/[\s_]+/g, "-")
//           .replace(/-+/g, "-");

//         responseData = await Product.find({
//           vendorId: vendorObjectId,
//           category: { $regex: new RegExp(`^${slugified}$`, "i") },
//         })
//           .select("name images price description category type isFavourite isAvailable rating")
//           .lean();
//       }
//     } else {
//       // Return all products for the vendor if categoryName is empty
//       responseData = await Product.find({ vendorId: vendorObjectId })
//         .select("name images price description category type isFavourite isAvailable rating")
//         .lean();
//     }

//     return res.status(200).json({
//       success: true,
//       count: responseData.length,
//       products: responseData,
//     });
//   } catch (err) {
//     console.error("GET PRODUCTS BY CATEGORY ERROR:", err);
//     return res.status(500).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };

// =====================================
// GET PRODUCTS BY VENDOR'S SUBCATEGORIES
// =====================================
exports.getProductsByVendorSubcategories = async (req, res) => {
  try {
    const { subcategoryName, categoryName } = req.query;
    const { vendorId } = req.params;

    if (!vendorId || !mongoose.Types.ObjectId.isValid(vendorId)) {
      return res.status(400).json({
        success: false,
        message: "Valid vendorId is required",
      });
    }

    const vendor = await Vendor.findById(vendorId);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    // 1. Initialize query object with vendorId / chefId match
    const query = {
      $or: [{ vendorId }, { chefId: vendorId }],
    };

    // 2. Partial & case-insensitive matching for subcategory
    if (subcategoryName) {
      const cleanSubcategory = subcategoryName.trim();
      query.subcategory = new RegExp(cleanSubcategory, "i");
    }

    // 3. Partial & case-insensitive matching for category
    if (categoryName) {
      const cleanCategory = categoryName.trim();
      query.category = new RegExp(cleanCategory, "i");
    }

    const products = await Product.find(query).select(
      "name images price discountPrice description rating isAvailable subcategory category vendorId chefId",
    );

    return res.status(200).json({
      success: true,
      count: products.length,
      products,
    });
  } catch (err) {
    console.log("GET PRODUCTS ERROR:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// =====================================
// GET PRODUCTS BY VENDOR'S Type (special, popular, featured, new)
// =====================================
exports.getProductsByVendorTypes = async (req, res) => {
  try {
    const { type } = req.query;
    const { vendorId } = req.params;

    if (!vendorId || !mongoose.Types.ObjectId.isValid(vendorId)) {
      return res.status(400).json({
        success: false,
        message: "Valid vendorId is required",
      });
    }

    const vendor = await Vendor.findById({ _id: vendorId });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    const query = {};

    if (type.toLowerCase()) query.type = type.toLowerCase();

    const products = await Product.find({ vendorId, ...query }).select(
      "name images price description",
    );

    return res.status(200).json({
      success: true,
      count: products.length,
      products,
    });
  } catch (err) {
    console.log("GET PRODUCTS ERROR:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// =====================================
// GET PRODUCTS BY Home Chefs'S Type (special, popular, featured, new)
// =====================================
exports.getProductsByHomeChefTypes = async (req, res) => {
  try {
    const { type } = req.query;
    const { homeChefId } = req.params;

    if (!homeChefId) {
      return res.status(400).json({
        success: false,
        message: "homeChefId is required",
      });
    }

    const homeChef = await HomeChef.findById(homeChefId);

    if (!homeChef) {
      return res.status(404).json({
        success: false,
        message: "Home Chef not found",
      });
    }

    const query = {};

    if (type) query.type = type;

    const products = await Product.find({ homeChefId, ...query }).select(
      "name images price description type",
    );

    return res.status(200).json({
      success: true,
      count: products.length,
      products,
    });
  } catch (err) {
    console.log("GET PRODUCTS ERROR:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// =====================================
// GET SINGLE PRODUCT
// =====================================
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate(
      "vendorId",
      "businessName logo status commissionRate",
    );

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
    const product = await Product.findById(req.params.id).select(
      "name image description rating price discountPrice addOns variations isAvailable isFavourite",
    );

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
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// =====================================
// UPDATE PRODUCT (with Socket IO Notifications)
// =====================================
exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Validate updated vendor existence if vendorId is being changed
    if (req.body.vendorId && req.body.vendorId !== String(product.vendorId)) {
      const vendor = await Vendor.findById(req.body.vendorId);
      if (!vendor) {
        return res.status(404).json({
          success: false,
          message: "Vendor not found",
        });
      }
    }

    // Comprehensive list of updatable product fields
    const fields = [
      "name",
      "description",
      "weight",
      "quantity",
      "images",
      "vendorId",
      "belongsTo",
      "category",
      "subcategory",
      "price",
      "discountPrice",
      "variations",
      "serving",
      "addOns",
      "isVeg",
      "tags",
      "likes",
      "isAvailable",
      "preparationTime",
      "rating",
      "status",
      "type",
    ];

    fields.forEach((field) => {
      if (req.body[field] !== undefined) {
        product[field] = req.body[field];
      }
    });

    await product.save();

    // Trigger Socket IO Real-time Events
    const io = req.app.get("io");

    if (io) {
      const targetVendorId = product.vendorId;

      // Notify Vendor Dashboard
      io.to(`vendor:${targetVendorId}`).emit("vendorProductUpdated", {
        vendorId: targetVendorId,
        product,
        message: "Product details updated successfully",
      });

      // Notify Active Customers viewing Vendor Menu Catalog
      io.to(`vendorCatalog:${targetVendorId}`).emit("menuCatalogUpdated", {
        vendorId: targetVendorId,
        action: "UPDATE_PRODUCT",
        product,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      product,
    });
  } catch (err) {
    console.error("UPDATE PRODUCT ERROR:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// =====================================
// TOGGLE AVAILABILITY (quick stock/sold-out action)
// =====================================
exports.toggleAvailability = async (req, res) => {
  try {
    const { isAvailable } = req.body;

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { isAvailable: !!isAvailable },
      { new: true },
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Availability updated",
      product,
    });
  } catch (err) {
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
    const product = await Product.findByIdAndDelete(req.params.id);

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

// ========================================================
// GET PREVIOUSLY ORDERED ITEMS ("Craving It Again?")
// ========================================================
exports.getPreviouslyOrderedItems = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;

    // 1. Find completed/delivered orders for the logged-in user
    const orders = await Order.find({
      userId,
      status: { $in: ["completed", "delivered"] },
    })
      .select("items")
      .sort({ createdAt: -1 });

    if (!orders || orders.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        items: [],
      });
    }

    // 2. Extract unique Product IDs ordered by the user
    const productIdsSet = new Set();
    orders.forEach((order) => {
      order.items?.forEach((item) => {
        if (item.productId) {
          productIdsSet.add(item.productId.toString());
        }
      });
    });

    const uniqueProductIds = Array.from(productIdsSet);

    // 3. Fetch product details with strict vendorId existence check
    const items = await Product.find({
      _id: { $in: uniqueProductIds },
      isAvailable: true,
      vendorId: { $exists: true, $ne: null }, // 💡 Only fetch items with valid vendorId
    })
      .populate("vendorId", "businessName logo rating offer")
      .select("name image images price rating isFavourite vendorId"); // 💡 Included 'images' and 'isFavourite'

    // 4. Format and filter items to ensure valid vendor object
    const formattedItems = items
      .map((product) => {
        const vendor = product.vendorId;

        // Skip product if vendor was deleted or unpopulated
        if (!vendor || !vendor._id) return null;

        return {
          _id: product._id,
          productName: product.name,
          productImage: product.images?.[0] || product.image || "",
          price: product.price,
          isFavourite: Boolean(product.isFavourite),
          rating: product.rating?.average || product.rating || 0,
          vendor: {
            _id: vendor._id,
            businessName: vendor.businessName || "Unknown Kitchen",
            logo: vendor.logo || "",
            offer: vendor.offer || "",
            rating: vendor.rating?.average || vendor.rating || 5.0,
          },
        };
      })
      .filter(Boolean); // Drop null entries

    return res.status(200).json({
      success: true,
      count: formattedItems.length,
      items: formattedItems,
    });
  } catch (err) {
    console.error("GET PREVIOUSLY ORDERED ITEMS ERROR:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ========================================================
// GET PREVIOUSLY ORDERED ITEMS BY FOOD CATEGORY
// ========================================================
exports.getPreviouslyOrderedItemsByCategory = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { category } = req.params; // Expecting categorySlug (e.g., "fast-food") or categoryName (e.g., "Fast Food")

    // 1. Find the Food Category document by slug or name
    const categoryDoc = await FoodCategory.findOne({
      $or: [
        { categorySlug: category.toLowerCase() },
        { categoryName: new RegExp(`^${category}$`, "i") },
      ],
      status: "active",
    });

    if (!categoryDoc) {
      return res.status(200).json({
        success: true,
        count: 0,
        items: [],
      });
    }

    // 2. Fetch completed/delivered orders for the user
    const orders = await Order.find({
      userId,
      status: { $in: ["completed", "delivered"] },
    })
      .select("items")
      .sort({ createdAt: -1 });

    if (!orders || orders.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        items: [],
      });
    }

    // 3. Extract unique Product IDs from orders
    const productIdsSet = new Set();
    orders.forEach((order) => {
      order.items?.forEach((item) => {
        if (item.productId) {
          productIdsSet.add(item.productId.toString());
        }
      });
    });

    const uniqueProductIds = Array.from(productIdsSet);

    // 4. Fetch ordered products matching categorySlug, categoryName, or Category ObjectId
    const items = await Product.find({
      _id: { $in: uniqueProductIds },
      isAvailable: true,
      $or: [
        { category: categoryDoc.categorySlug },
        { category: categoryDoc.categoryName },
        { category: categoryDoc._id },
      ],
    })
      .populate("vendorId", "businessName logo rating offer")
      // .populate("chefId", "name logo rating offer")
      .select(
        "name images image price discountPrice rating isFavourite chefId vendorId",
      );

    // 5. Format response to match product card structure
    const formattedItems = items.map((product) => {
      const seller = product.vendorId || product.chefId;

      return {
        _id: product._id,
        productName: product.name,
        productImage:
          Array.isArray(product.images) && product.images.length > 0
            ? product.images[0]
            : product.image || "",
        price: product.price,
        discountPrice: product.discountPrice || null,
        isFavourite: product.isFavourite || false,
        rating: product.rating || { average: 0, count: 0 },
        vendor: seller
          ? {
              _id: seller._id,
              businessName: seller.businessName || "",
              logo: seller.logo || "",
              offer: seller.offer || "",
              rating: seller.rating?.average || seller.rating || 0,
            }
          : null,
      };
    });

    return res.status(200).json({
      success: true,
      category: {
        _id: categoryDoc._id,
        name: categoryDoc.categoryName,
        slug: categoryDoc.categorySlug,
        icon: categoryDoc.icon,
      },
      count: formattedItems.length,
      items: formattedItems,
    });
  } catch (err) {
    console.error("GET PREVIOUSLY ORDERED ITEMS BY CATEGORY ERROR:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
