const Menu = require("../models/Menu");
const Product = require("../models/Product");
const Deal = require("../models/Deal");

/**
 * Create or Upsert Menu
 * POST /api/restaurants/menu
 */
exports.createMenu = async (req, res) => {
  try {
    const { belongsTo, restaurantId, homeChefId, categories } = req.body;

    if (!restaurantId && !homeChefId) {
      return res.status(400).json({
        success: false,
        message: "Please provide either restaurantId or homeChefId",
      });
    }

    const filter = restaurantId
      ? { restaurantId: new mongoose.Types.ObjectId(restaurantId) }
      : { homeChefId: new mongoose.Types.ObjectId(homeChefId) };

    const menuData = {
      belongsTo: belongsTo || "Restaurant",
      restaurantId: restaurantId ? new mongoose.Types.ObjectId(restaurantId) : undefined,
      homeChefId: homeChefId ? new mongoose.Types.ObjectId(homeChefId) : undefined,
      categories: categories || [],
    };

    // Upsert: Create new if doesn't exist, update if it does
    const updatedMenu = await Menu.findOneAndUpdate(filter, menuData, {
      new: true,
      upsert: true,
      runValidators: true,
    }).populate({
      path: "categories.products",
      select: "name description price images isAvailable status",
    });

    return res.status(201).json({
      success: true,
      message: "Menu created/updated successfully",
      data: updatedMenu,
    });
  } catch (error) {
    console.error("Error in createMenu:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create menu",
      error: error.message,
    });
  }
};

/**
 * Get Menu for Mobile App Screen
 * GET /api/restaurants/menu?restaurantId=6a57323f8cf2d87bf78f3340
 */
exports.getMenu = async (req, res) => {
  try {
    let { restaurantId, homeChefId } = req.query;

    if (restaurantId) restaurantId = restaurantId.replace(/['"]+/g, "").trim();
    if (homeChefId) homeChefId = homeChefId.replace(/['"]+/g, "").trim();

    if (!restaurantId && !homeChefId) {
      return res.status(400).json({
        success: false,
        message: "Please provide either restaurantId or homeChefId",
      });
    }

    const filter = restaurantId
      ? { restaurantId: new mongoose.Types.ObjectId(restaurantId) }
      : { homeChefId: new mongoose.Types.ObjectId(homeChefId) };

    // const menu = await Menu.findOne(filter).populate({
    //   path: "categories.products",
    //   select: "_id name description price images",
    // });

    const menu = restaurantId

    if (!menu) {
      return res.status(404).json({
        success: false,
        message: "Menu not found for this restaurant",
      });
    }

    // Format output matching your exact requested JSON response structure
    return res.status(200).json({
      success: true,
      restaurantId: menu.restaurantId || menu.homeChefId,
      categories: menu.categories.map((cat) => ({
        _id: cat._id,
        categoryName: cat.categoryName,
        products: cat.products || [],
      })),
    });
  } catch (error) {
    console.error("Error in getMenu:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch menu",
      error: error.message,
    });
  }
};

/**
 * Get Full Dynamic Menu for Customer Mobile App / Web
 * GET /api/menu?restaurantId=... or ?homeChefId=...
 */
// exports.getMenu = async (req, res) => {
//   try {
//     const { restaurantId, homeChefId, category, search } = req.query;

//     if (!restaurantId && !homeChefId) {
//       return res.status(400).json({
//         success: false,
//         message: "Please provide either restaurantId or homeChefId",
//       });
//     }

//     const queryFilter = {
//       status: "active",
//       ...(restaurantId ? { restaurantId } : { homeChefId }),
//     };

//     if (search) {
//       queryFilter.name = { $regex: search, $options: "i" };
//     }

//     if (category && category !== "All") {
//       queryFilter.category = category;
//     }

//     // 1. Fetch active Deals
//     const deals = await Deal.find({
//       ...(restaurantId ? { restaurantId } : { homeChefId }),
//       isActive: true,
//     });

//     // 2. Fetch Products
//     const products = await Product.find(queryFilter).sort({ createdAt: -1 });

//     // 3. Extract distinct categories available for tabs
//     const availableCategories = await Product.distinct("category", {
//       status: "active",
//       ...(restaurantId ? { restaurantId } : { homeChefId }),
//     });

//     // 4. Categorize special/popular products based on type/tags
//     const specials = products.filter(
//       (p) => p.type === "special" || p.type === "popular" || p.type === "signature"
//     );

//     // 5. Group remaining products by category
//     const groupedByCategory = products.reduce((acc, product) => {
//       const cat = product.category || "Others";
//       if (!acc[cat]) acc[cat] = [];
//       acc[cat].push(product);
//       return acc;
//     }, {});

//     return res.status(200).json({
//       success: true,
//       data: {
//         categories: ["All", ...availableCategories],
//         deals,
//         specials,
//         groupedProducts: groupedByCategory,
//         allProducts: products,
//       },
//     });
//   } catch (error) {
//     return res.status(500).json({
//       success: false,
//       message: "Server Error",
//       error: error.message,
//     });
//   }
// };

/**
 * Quick Stock / Availability Toggle for Admin & Vendors
 * PATCH /api/menu/product/:id/toggle-availability
 */
exports.toggleProductAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    product.isAvailable = !product.isAvailable;
    await product.save();

    return res.status(200).json({
      success: true,
      message: `Product is now ${product.isAvailable ? "available" : "unavailable"}`,
      data: product,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

/**
 * Configure / Initialize Menu Layout & Featured Items
 * POST /api/menu/configure
 */
exports.configureMenu = async (req, res) => {
  try {
    const { belongsTo, restaurantId, homeChefId, featuredDeals, featuredProducts, categoriesOrder } = req.body;

    const filter = restaurantId ? { restaurantId } : { homeChefId };

    const menu = await Menu.findOneAndUpdate(
      filter,
      {
        belongsTo,
        restaurantId,
        homeChefId,
        featuredDeals,
        featuredProducts,
        categoriesOrder,
      },
      { new: true, upsert: true }
    );

    return res.status(200).json({
      success: true,
      message: "Menu configuration updated successfully",
      data: menu,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};