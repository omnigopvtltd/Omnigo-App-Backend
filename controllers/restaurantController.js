const Restaurant = require("../models/Restaurant");
const Product = require("../models/Product");
const HomeChef = require("../models/HomeChef");
const { default: mongoose } = require("mongoose");
const Deal = require("../models/Deal");

// =====================================
// CREATE RESTAURANT
// =====================================
exports.createRestaurant = async (req, res) => {
  try {
    const {
      name,
      description,
      logo,
      coverImage,
      cuisines,
      ownerId,
      contact,
      address,
      openingHours,
      isOpen,
      isFreeDelivery,
      deliveryTime,
      minimumOrder,
      deliveryFee,
      commissionRate,
      status,
      isFeatured,
      lat,
      lng,
    } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Restaurant name is required",
      });
    }

    if (!contact?.phone) {
      return res.status(400).json({
        success: false,
        message: "Contact phone is required",
      });
    }

    if (!address?.street || !address?.city) {
      return res.status(400).json({
        success: false,
        message: "Address street and city are required",
      });
    }

    const payload = {
      name,
      slug: description,
      logo,
      coverImage,
      cuisines: Array.isArray(cuisines) ? cuisines : [],
      ownerId: ownerId || null,
      contact,
      address: { ...address },
      openingHours,
      isOpen,
      isFreeDelivery,
      deliveryTime,
      minimumOrder,
      deliveryFee,
      commissionRate,
      status,
      isFeatured,
    };

    if (lat !== undefined && lng !== undefined) {
      payload.address.location = {
        type: "Point",
        coordinates: [Number(lng), Number(lat)],
      };
    }

    const restaurant = await Restaurant.create(payload);

    return res.status(201).json({
      success: true,
      message: "Restaurant created successfully",
      restaurant,
    });
  } catch (err) {
    console.log("CREATE RESTAURANT ERROR:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// =====================================
// GET ALL RESTAURANTS (filter, search, paginate)
// =====================================
exports.getAllRestaurants = async (req, res) => {
  try {
    const {
      status,
      cuisine,
      search,
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const query = {};

    if (status && status !== "all") query.status = status;
    if (cuisine) query.cuisines = cuisine;

    if (search) {
      const regex = new RegExp(search, "i");
      query.$or = [
        { name: regex },
        { "address.city": regex },
        { "contact.phone": regex },
      ];
    }

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.max(parseInt(limit, 10) || 20, 1);
    const skip = (pageNum - 1) * limitNum;
    const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

    const [restaurants, total] = await Promise.all([
      Restaurant.find(query).sort(sort).skip(skip).limit(limitNum),
      Restaurant.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      count: restaurants.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      restaurants,
    });
  } catch (err) {
    console.log("GET RESTAURANTS ERROR:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// =====================================
// GET ALL RESTAURANT BRANDS (filter, search, paginate)
// =====================================
exports.getAllRestaurantBrands = async (req, res) => {
  try {
    const restaurants = await Restaurant.find().select("name logo _id");

    return res.status(200).json({
      success: true,
      count: restaurants.length,
      restaurants,
    });
  } catch (err) {
    console.log("GET RESTAURANTS ERROR:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// =====================================
// GET RESTAURANT CATEGORIES
// =====================================
exports.getRestaurantCategories = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id).select(
      "categories",
    );

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found",
      });
    }

    const categories = restaurant.categories.map((category) => ({
      _id: category._id,
      categoryName: category.categoryName,
    }));

    return res.status(200).json({
      success: true,
      count: categories.length,
      categories,
    });
  } catch (err) {
    console.log("GET RESTAURANT CATEGORIES ERROR:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// =====================================
// GET SINGLE RESTAURANT
// =====================================
exports.getRestaurantById = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id)
    .select("name logo description coverImage rating isOpen deliveryFee deliveryTime isFreeDelivery openingHours")
    .populate(
      "ownerId",
      "name email phone",
    );

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found",
      });
    }

    return res.status(200).json({
      success: true,
      restaurant,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// =====================================
// GET RESTAURANTS BY FAST DELIVERY TIME (for "Fast Delivery" section)
// =====================================
exports.getRestaurantByFastDeliveryTime = async (req, res) => {
  try {
    // 1. Fetch Restaurants (assumes deliveryTime is a Number or object)
    const restaurant = await Restaurant.find({
      $or: [
        { "deliveryTime.max": { $lte: 20 } },
        { "deliveryTime.min": { $lte: 20 } },
      ],
    }).select("name logo _id coverImage deliveryTime rating");

    // 2. Fetch HomeChefs querying the nested object field (deliveryTime.max)
    const homeChef = await HomeChef.find({
      $or: [
        { "deliveryTime.max": { $lte: 20 } },
        { "deliveryTime.min": { $lte: 20 } },
      ],
    }).select("name logo _id coverImage deliveryTime rating");

    const offer = {
      type: "offer",
      title: "Fast Delivery",
      icon: "⚡",
    };

    // 3. Merge arrays
    // const fastDeliveryRestaurants = [...restaurant, ...homeChef, offer ];
    const fastDeliveryRestaurants = [
      ...restaurant.map((item) => ({
        ...item.toObject(),
        offer: {
          title: "Fast Delivery",
          icon: "⚡",
        },
      })),

      ...homeChef.map((item) => ({
        ...item.toObject(),
        offer: {
          title: "Fast Delivery",
          icon: "⚡",
        },
      })),
    ];

    // 4. Check if merged array is empty
    if (fastDeliveryRestaurants.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No fast delivery options found",
      });
    }

    return res.status(200).json({
      success: true,
      count: fastDeliveryRestaurants.length,
      fastDeliveryRestaurants,
    });
  } catch (err) {
    console.error("FAST DELIVERY ERROR:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// =====================================
// UPDATE RESTAURANT
// =====================================
exports.updateRestaurant = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found",
      });
    }

    const { id } = req.params;
    const updateData = { ...req.body };

    // If updating categories, automatically sync root subCategories
    if (updateData.categories && Array.isArray(updateData.categories)) {
      const allSubCategories = updateData.categories.flatMap(
        (cat) => cat.subCategories || [],
      );
      // Remove duplicate subcategories
      updateData.subCategories = [...new Set(allSubCategories)];
    }

    const fields = [
      "name",
      "description",
      "logo",
      "coverImage",
      "cuisines",
      "categories",
      "ownerId",
      "contact",
      "address",
      "openingHours",
      "isOpen",
      "deliveryTime",
      "minimumOrder",
      "deliveryFee",
      "commissionRate",
      "isFeatured",
    ];

    fields.forEach((field) => {
      if (req.body[field] !== undefined) {
        restaurant[field] = req.body[field];
      }
    });

    if (req.body.lat !== undefined && req.body.lng !== undefined) {
      restaurant.address.location = {
        type: "Point",
        coordinates: [Number(req.body.lng), Number(req.body.lat)],
      };
    }

    await restaurant.save();

    return res.status(200).json({
      success: true,
      message: "Restaurant updated successfully",
      restaurant,
    });
  } catch (err) {
    console.log("UPDATE RESTAURANT ERROR:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// =====================================
// UPDATE RESTAURANT STATUS (approve / block / pending)
// =====================================
exports.updateRestaurantStatus = async (req, res) => {
  try {
    const { status } = req.body;
    console.log("Status", status);
    const allowedStatuses = ["pending", "approved", "blocked"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    const restaurant = await Restaurant.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true },
    );

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: `Restaurant marked as ${status}`,
      restaurant,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// =====================================
// DELETE RESTAURANT
// =====================================
exports.deleteRestaurant = async (req, res) => {
  try {
    const restaurant = await Restaurant.findByIdAndDelete(req.params.id);

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found",
      });
    }

    // Keep the catalog consistent — a restaurant's products can't exist without it
    await Product.deleteMany({ restaurantId: restaurant._id });

    return res.status(200).json({
      success: true,
      message: "Restaurant and its products deleted successfully",
    });
  } catch (err) {
    console.log("DELETE RESTAURANT ERROR:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.restaurantMenu = async (req, res) => {
  try {
    const { restaurantId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Restaurant ID format",
      });
    }

    const restObjectId = new mongoose.Types.ObjectId(restaurantId);

    // 1. Fetch Deals, Product Types, and Products by Category in Parallel (Max 3 Db Calls)
    const [dealsGrouped, productsByType, restaurantDoc, productsByCategory] =
      await Promise.all([
        // Group Active Deals by dealType (limit 5 per type)
        Deal.aggregate([
          { $match: { restaurantId: restObjectId, isActive: true } },
          { $sort: { isFeatured: -1, createdAt: -1 } },
          {
            $group: {
              _id: "$dealType",
              items: {
                $push: {
                  _id: "$_id",
                  name: "$title",
                  image: "$image",
                  originalPrice: "$originalPrice",
                  discountPrice: "$discountPrice",
                  dealType: "$dealType",
                },
              },
            },
          },
          { $project: { items: { $slice: ["$items", 5] } } },
        ]),

        // Group Special Product Types (special, popular, featured, new) (limit 5 per type)
        Product.aggregate([
          {
            $match: {
              restaurantId: restObjectId,
              type: { $in: ["special", "popular", "featured", "new"] },
            },
          },
          {
            $group: {
              _id: "$type",
              items: {
                $push: {
                  _id: "$_id",
                  name: "$name",
                  description: "$description",
                  price: "$price",
                  images: "$images",
                  isFavourite: "$isFavourite",
                  rating: "$rating",
                },
              },
            },
          },
          { $project: { items: { $slice: ["$items", 5] } } },
        ]),

        // Fetch Restaurant Categories
        Restaurant.findById(restObjectId).select("categories").lean(),

        // Fetch Regular Products grouped by Category (limit 5 per category)
        Product.aggregate([
          { $match: { restaurantId: restObjectId } },
          {
            $group: {
              _id: "$category",
              products: {
                $push: {
                  _id: "$_id",
                  name: "$name",
                  description: "$description",
                  price: "$price",
                  images: "$images",
                },
              },
            },
          },
          { $project: { products: { $slice: ["$products", 5] } } },
        ]),
      ]);

    // 2. Build Quick Map Lookups for Fast Transformation
    const dealMap = {};
    dealsGrouped.forEach((d) => (dealMap[d._id] = d.items));

    const productTypeMap = {};
    productsByType.forEach((p) => (productTypeMap[p._id] = p.items));

    const categoryProductMap = {};
    productsByCategory.forEach((c) => (categoryProductMap[c._id] = c.products));

    const categoriesResponse = [];

    // 3. Add Deal Sections
    const dealTypes = [
      { key: "Offer Deal", label: "Offer Deals" },
      { key: "Bogo Deal", label: "Bogo Deals" },
      { key: "Combo Deal", label: "Combo Deals" },
      { key: "Flash Deal", label: "Flash Deals" },
      { key: "Seasonal Deal", label: "Seasonal Deals" },
      { key: "Free Delivery Deal", label: "Free Delivery Deals" },
      { key: "Daily Deal", label: "Daily Deals" },
    ];

    dealTypes.forEach(({ key, label }) => {
      if (dealMap[key] && dealMap[key].length > 0) {
        categoriesResponse.push({
          _id: new mongoose.Types.ObjectId(),
          categoryName: label,
          products: dealMap[key],
        });
      }
    });

    // 4. Add Special Product Type Sections
    const productTypes = [
      { key: "special", label: "Special Items" },
      { key: "popular", label: "Popular Items" },
      { key: "featured", label: "Featured Items" },
      { key: "new", label: "New Items" },
    ];

    productTypes.forEach(({ key, label }) => {
      if (productTypeMap[key] && productTypeMap[key].length > 0) {
        categoriesResponse.push({
          _id: new mongoose.Types.ObjectId(),
          categoryName: label,
          products: productTypeMap[key],
        });
      }
    });

    // 5. Add Restaurant Specific Categories (Burger, Pizza, etc.)
    const storeCategories = restaurantDoc?.categories || [];
    storeCategories.forEach((cat) => {
      const catName = cat.categoryName || cat.name || cat;
      categoriesResponse.push({
        _id: cat._id || new mongoose.Types.ObjectId(),
        categoryName: catName,
        products: categoryProductMap[catName] || [],
      });
    });

    // 6. Return Structured Uniform Response
    return res.status(200).json({
      success: true,
      restaurantId,
      categories: categoriesResponse,
    });
  } catch (err) {
    console.error("GET RESTAURANT MENU ERROR:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
