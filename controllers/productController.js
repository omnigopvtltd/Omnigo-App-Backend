// const Product = require("../models/Product");

// // ================= IMAGE HELPER =================
// const getImageUrl = (req) => {
//   if (!req.file) return "";
//   return `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
// };

// // ================= GET ALL PRODUCTS =================
// exports.getProducts = async (req, res) => {
//   try {
//     const { category, q } = req.query;

//     let filter = {
//       isActive: true,
//     };

//     if (category) {
//       filter.category = category;
//     }

//     if (q) {
//       filter.name = { $regex: q, $options: "i" };
//     }

//     const products = await Product.find(filter).sort({
//       createdAt: -1,
//     });

//     const formattedProducts = products.map((item) => ({
//       id: item._id,
//       name: item.name,
//       weight: item.weight,
//       image: item.image,
//       description: item.description,
//       price: item.price,
//       quantity: item.quantity,
//       category: item.category,
//       likes: item.likes.length,
//       createdAt: item.createdAt,
//     }));

//     res.status(200).json(formattedProducts);
//   } catch (error) {
//     console.log("❌ GET PRODUCTS ERROR:", error);

//     res.status(500).json({
//       message: "Server Error",
//       error: error.message,
//     });
//   }
// };

// // ================= GET SINGLE PRODUCT =================
// exports.getProduct = async (req, res) => {
//   try {
//     const product = await Product.findById(req.params.id);

//     if (!product) {
//       return res.status(404).json({
//         message: "Product not found",
//       });
//     }

//     res.status(200).json({
//       id: product._id,
//       name: product.name,
//       weight: product.weight,
//       image: product.image,
//       description: product.description,
//       price: product.price,
//       quantity: product.quantity,
//       category: product.category,
//       likes: product.likes.length,
//       createdAt: product.createdAt,
//     });
//   } catch (error) {
//     console.log("❌ GET PRODUCT ERROR:", error);

//     res.status(500).json({
//       message: "Server Error",
//       error: error.message,
//     });
//   }
// };

// // ================= CREATE PRODUCT =================
// exports.createProduct = async (req, res) => {
//   try {
//     console.log("🔥 BODY:", req.body);
//     console.log("🔥 FILE:", req.file);

//     const io = req.app.get("io");

//     if (!req.body) {
//       return res.status(400).json({
//         message: "Request body missing",
//       });
//     }

//     const {
//       name,
//       weight,
//       price,
//       category,
//       description,
//     } = req.body;

//     if (!name || !price) {
//       return res.status(400).json({
//         message: "Name and price are required",
//       });
//     }

//     const product = await Product.create({
//       name,
//       weight: weight || "",
//       price: Number(price),
//       quantity: 1,
//       category: category || "",
//       description: description || "",
//       image: getImageUrl(req),
//       likes: [],
//     });

//     if (io) {
//       io.emit("product_created", product);
//     }

//     res.status(201).json({
//       success: true,
//       message: "Product created successfully",
//       product,
//     });
//   } catch (error) {
//     console.log("❌ CREATE PRODUCT ERROR:", error);

//     res.status(500).json({
//       message: "Server Error",
//       error: error.message,
//     });
//   }
// };

// // ================= UPDATE PRODUCT =================
// exports.updateProduct = async (req, res) => {
//   try {
//     const io = req.app.get("io");

//     const product = await Product.findById(req.params.id);

//     if (!product) {
//       return res.status(404).json({
//         message: "Product not found",
//       });
//     }

//     const updatedData = {
//       name: req.body.name,
//       weight: req.body.weight,
//       price: Number(req.body.price),
//       quantity:
//         req.body.quantity !== undefined
//           ? Number(req.body.quantity)
//           : product.quantity,
//       category: req.body.category,
//       description: req.body.description,
//     };

//     if (req.file) {
//       updatedData.image = getImageUrl(req);
//     }

//     const updatedProduct = await Product.findByIdAndUpdate(
//       req.params.id,
//       updatedData,
//       {
//         new: true,
//         runValidators: true,
//       }
//     );

//     if (io) {
//       io.emit("product_updated", updatedProduct);
//     }

//     res.status(200).json({
//       success: true,
//       message: "Product updated successfully",
//       product: updatedProduct,
//     });
//   } catch (error) {
//     console.log("❌ UPDATE PRODUCT ERROR:", error);

//     res.status(500).json({
//       message: "Server Error",
//       error: error.message,
//     });
//   }
// };

// // ================= DELETE PRODUCT =================
// exports.deleteProduct = async (req, res) => {
//   try {
//     const io = req.app.get("io");

//     const product = await Product.findByIdAndDelete(req.params.id);

//     if (!product) {
//       return res.status(404).json({
//         message: "Product not found",
//       });
//     }

//     if (io) {
//       io.emit("product_deleted", {
//         id: product._id,
//       });
//     }

//     res.status(200).json({
//       success: true,
//       message: "Product deleted successfully",
//     });
//   } catch (error) {
//     console.log("❌ DELETE PRODUCT ERROR:", error);

//     res.status(500).json({
//       message: "Server Error",
//       error: error.message,
//     });
//   }
// };

// // ================= LIKE PRODUCT =================
// exports.likeProduct = async (req, res) => {
//   try {
//     const io = req.app.get("io");

//     const product = await Product.findById(req.params.id);

//     if (!product) {
//       return res.status(404).json({
//         message: "Product not found",
//       });
//     }

//     product.likes.push(new Product.base.Types.ObjectId());

//     await product.save();

//     if (io) {
//       io.emit("product_liked", {
//         productId: product._id,
//         likes: product.likes.length,
//       });
//     }

//     res.status(200).json({
//       success: true,
//       message: "Liked",
//       likes: product.likes.length,
//     });
//   } catch (error) {
//     console.log("❌ LIKE PRODUCT ERROR:", error);

//     res.status(500).json({
//       message: "Server Error",
//     });
//   }
// };

// // ================= UNLIKE PRODUCT =================
// exports.unlikeProduct = async (req, res) => {
//   try {
//     const io = req.app.get("io");

//     const product = await Product.findById(req.params.id);

//     if (!product) {
//       return res.status(404).json({
//         message: "Product not found",
//       });
//     }

//     if (product.likes.length > 0) {
//       product.likes.pop();
//       await product.save();
//     }

//     if (io) {
//       io.emit("product_unliked", {
//         productId: product._id,
//         likes: product.likes.length,
//       });
//     }

//     res.status(200).json({
//       success: true,
//       message: "Unliked",
//       likes: product.likes.length,
//     });
//   } catch (error) {
//     console.log("❌ UNLIKE PRODUCT ERROR:", error);

//     res.status(500).json({
//       message: "Server Error",
//     });
//   }
// };

// // ================= GET ALL CATEGORIES =================
// exports.getCategories = async (req, res) => {
//   try {
//     const categories = await Product.distinct("category", {
//       isActive: true,
//     });

//     res.status(200).json(categories);
//   } catch (error) {
//     console.log("❌ GET CATEGORIES ERROR:", error);

//     res.status(500).json({
//       message: "Server Error",
//       error: error.message,
//     });
//   }
// };

/////////////////////////////////////////////////////////////////////
const Order = require("../models/Order");
const Product = require("../models/Product");
const Restaurant = require("../models/Restaurant");
const FoodCategory = require("../models/FoodCategories");
const HomeChef = require("../models/HomeChef");
const { default: mongoose } = require("mongoose");

// =====================================
// CREATE PRODUCT
// =====================================
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
      // homeChefId,
      category,
      subcategory,
      price,
      discountPrice,
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

    // const restaurant = await Restaurant.findById(restaurantId);

    // if (!restaurant) {
    //   return res.status(404).json({
    //     success: false,
    //     message: "Restaurant not found",
    //   });
    // }

    const product = await Product.create({
      name,
      description,
      images: Array.isArray(images) ? images : [],
      weight,
      quantity,
      belongsTo,
      vendorId,
      // homeChefId,
      category,
      subcategory,
      price,
      discountPrice: discountPrice || null,
      addOns: Array.isArray(addOns) ? addOns : [],
      isVeg,
      tags: Array.isArray(tags) ? tags : [],
      isAvailable,
      preparationTime,
      rating,
      status,
      type,
      likes: Array.isArray(likes) ? likes : [],
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
// GET ALL PRODUCTS (filter, search, paginate)
// =====================================
exports.getAllProducts = async (req, res) => {
  try {
    const {
      restaurantId,
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

    if (restaurantId) query.restaurantId = restaurantId;
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
        .populate("restaurantId", "name logo status type")
        .sort(sort)
        .skip(skip)
        .limit(limitNum),
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
    console.log("GET PRODUCTS ERROR:", err);

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
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .select("category"),
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
// GET PRODUCTS BY CATEGORY
// =====================================
exports.getProductsByCategory = async (req, res) => {
  try {
    const { category, subcategory } = req.query;

    const query = {};

    // Helper to build a case-insensitive regex pattern handling spaces/dashes (e.g. "fast food" or "fast-food")
    const createFlexibleRegex = (input) => {
      if (!input) return null;
      // Convert hyphens/multiple spaces to a flexible whitespace pattern
      const sanitized = input.trim().replace(/[-_\s]+/g, "[-\\s_]*");
      return new RegExp(`^${sanitized}$`, "i");
    };

    if (category) {
      query.category = createFlexibleRegex(category);
    }

    if (subcategory) {
      query.subcategory = createFlexibleRegex(subcategory);
    }

    // 1. Query products matching category/subcategory
    const products = await Product.find(query).select(
      "name images price tags discountPrice category subcategory rating isAvailable isFavourite restaurantId belongsTo chefId",
    );

    // 2. Extract restaurant IDs safely
    const restaurantIds = products.map((p) => p.restaurantId).filter(Boolean);

    // 3. Query associated restaurants
    const restaurants = await Restaurant.find({
      _id: { $in: restaurantIds },
    }).select("name logo");

    // 4. Map restaurant data into product objects
    const restaurantMap = new Map(
      restaurants.map((r) => [r._id.toString(), r]),
    );

    const productsWithVendor = products.map((productDoc) => {
      const product = productDoc.toObject();
      const vendor = product.restaurantId
        ? restaurantMap.get(product.restaurantId.toString())
        : null;

      return {
        ...product,
        restaurant: vendor || null,
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

    const query = {};
    if (type.toLowerCase()) query.type = type.toLowerCase();

    // 1. Fetch products and populate restaurant/chef details directly
    const products = await Product.find(query)
      .populate("restaurantId", "name logo deliveryTime")
      .populate("homeChefId", "name logo deliveryTime")
      .select(
        "name images price discountPrice rating restaurantId homeChefId belongsTo isFavourite",
      );

    // 2. Map through products to format output key cleanly as "restaurant" or "chef"
    const formattedProducts = products.map((product) => {
      const seller = product.restaurantId || product.homeChefId;

      return {
        _id: product._id,
        name: product.name,
        images: product.images,
        price: product.price,
        discountPrice: product.discountPrice,
        rating: product.rating,
        restaurant: seller
          ? {
              _id: seller._id,
              name: seller.name,
              logo: seller.logo,
              deliveryTime: seller.deliveryTime,
            }
          : null,
      };
    });

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
// GET PRODUCTS BY RESTAURANT
// =====================================
exports.getProductsByRestaurant = async (req, res) => {
  try {
    const { restaurantId } = req.params;

    if (!restaurantId) {
      return res.status(400).json({
        success: false,
        message: "restaurantId is required",
      });
    }

    const restaurant = await Restaurant.findById(restaurantId);

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found",
      });
    }

    const products = await Product.find({ restaurantId });

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
// GET PRODUCTS BY Home Chef
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

    const homeChef = await HomeChef.findById(homeChefId);

    if (!homeChef) {
      return res.status(404).json({
        success: false,
        message: "Home Chef not found",
      });
    }

    const products = await Product.find({ homeChefId });

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
// GET PRODUCTS BY RESTAURANT'S CATEGORIES
// =====================================
exports.getProductsByRestaurantCategories = async (req, res) => {
  try {
    const { categoryName } = req.query;
    const { restaurantId } = req.params;

    if (!restaurantId || !mongoose.Types.ObjectId.isValid(restaurantId)) {
      return res.status(400).json({
        success: false,
        message: "Valid restaurantId is required",
      });
    }

    const restaurant = await Restaurant.findById(restaurantId).lean();
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found",
      });
    }

    const query = { restaurantId };

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

// =====================================
// GET PRODUCTS BY RESTAURANT'S SUBCATEGORIES
// =====================================
exports.getProductsByRestaurantSubcategories = async (req, res) => {
  try {
    const { subcategoryName, categoryName } = req.query;
    const { restaurantId } = req.params;

    if (!restaurantId) {
      return res.status(400).json({
        success: false,
        message: "restaurantId is required",
      });
    }

    const restaurant = await Restaurant.findById(restaurantId);

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found",
      });
    }

    // Match either restaurantId or chefId for flexibility
    const query = {
      $or: [{ restaurantId }, { chefId: restaurantId }],
    };

    // Partial & case-insensitive matching for subcategory
    if (subcategoryName) {
      const cleanSubcategory = subcategoryName.trim();
      query.subcategory = new RegExp(cleanSubcategory, "i");
    }

    // Partial & case-insensitive matching for category
    if (categoryName) {
      const cleanCategory = categoryName.trim();
      query.category = new RegExp(cleanCategory, "i");
    }

    const products = await Product.find(query).select(
      "name images price discountPrice description rating isAvailable subcategory category restaurantId chefId",
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
// GET PRODUCTS BY RESTAURANT'S Type (special, popular, featured, new)
// =====================================
exports.getProductsByRestaurantTypes = async (req, res) => {
  try {
    const { type } = req.query;
    const { restaurantId } = req.params;

    if (!restaurantId) {
      return res.status(400).json({
        success: false,
        message: "restaurantId is required",
      });
    }

    const restaurant = await Restaurant.findById(restaurantId);

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found",
      });
    }

    const query = {};

    if (type.toLowerCase()) query.type = type.toLowerCase();

    const products = await Product.find({ restaurantId, ...query }).select(
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
      "restaurantId",
      "name logo status commissionRate",
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
      "name image description rating price discountPrice addOns sizes isAvailable isFavourite",
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
// UPDATE PRODUCT
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

    if (
      req.body.restaurantId &&
      req.body.restaurantId !== String(product.restaurantId)
    ) {
      const restaurant = await Restaurant.findById(req.body.restaurantId);
      if (!restaurant) {
        return res.status(404).json({
          success: false,
          message: "Restaurant not found",
        });
      }
    }

    const fields = [
      "name",
      "description",
      "weight",
      "quantity",
      "images",
      "restaurantId",
      "category",
      "subcategory",
      "price",
      "discountPrice",
      "addOns",
      "isVeg",
      "tags",
      "likes",
      "isAvailable",
      "preparationTime",
      "status",
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

    // 3. Fetch product details and populate seller info (Restaurant / HomeChef)
    const items = await Product.find({
      _id: { $in: uniqueProductIds },
      isAvailable: true,
    })
      .populate("restaurantId", "name logo rating")
      .populate("chefId", "name logo rating rating.average")
      .select("name image price rating chefId restaurantId");

    // 4. Format the response specifically for the card UI layout
    const formattedItems = items.map((product) => {
      const restaurant = product.chefId || product.restaurantId;
      return {
        _id: product._id,
        productName: product.name,
        productImage: product.image,
        price: product.price,
        isFavourite: product.isFavourite,
        rating: product.rating?.average || 0,
        restaurant: {
          _id: restaurant?._id || null,
          name: restaurant?.name || "Unknown Kitchen",
          logo: restaurant?.logo || "",
          offer: restaurant?.offer || "",
          rating: restaurant?.rating?.average || restaurant?.rating || 5.0,
        },
      };
    });

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
      .populate("restaurantId", "name logo rating offer")
      .populate("chefId", "name logo rating offer")
      .select(
        "name images image price discountPrice rating isFavourite chefId restaurantId",
      );

    // 5. Format response to match product card structure
    const formattedItems = items.map((product) => {
      const seller = product.restaurantId || product.chefId;

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
        restaurant: seller
          ? {
              _id: seller._id,
              name: seller.name,
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
