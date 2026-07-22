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
const Product = require("../models/Product");
const Restaurant = require("../models/Restaurant");

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
      restaurantId,
      category,
      subcategory,
      price,
      discountPrice,
      addOns,
      isVeg,
      tags,
      isAvailable,
      preparationTime,
      status,
      likes,
    } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Product name is required",
      });
    }

    if (!restaurantId) {
      return res.status(400).json({
        success: false,
        message: "restaurantId is required",
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

    const restaurant = await Restaurant.findById(restaurantId);

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found",
      });
    }

    const product = await Product.create({
      name,
      description,
      images: Array.isArray(images) ? images : [],
      weight,
      quantity,
      restaurantId,
      category,
      subcategory,
      price,
      discountPrice: discountPrice || null,
      addOns: Array.isArray(addOns) ? addOns : [],
      isVeg,
      tags: Array.isArray(tags) ? tags : [],
      isAvailable,
      preparationTime,
      status,
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
        .populate("restaurantId", "name logo status")
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
// GET SINGLE PRODUCT
// =====================================
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate(
      "restaurantId",
      "name logo status commissionRate"
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
      { new: true }
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