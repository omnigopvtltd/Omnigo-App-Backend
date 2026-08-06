const Restaurant = require("../models/Restaurant");
const Product = require("../models/Product");
const HomeChef = require("../models/HomeChef");

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
      slug: 
      description,
      logo,
      coverImage,
      cuisines: Array.isArray(cuisines) ? cuisines : [],
      ownerId: ownerId || null,
      contact,
      address: { ...address },
      openingHours,
      isOpen,
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
// GET SINGLE RESTAURANT
// =====================================
exports.getRestaurantById = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id).populate(
      "ownerId",
      "name email phone"
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
        { "deliveryTime.min": { $lte: 20 } }
      ]
    }).select("name logo _id coverImage deliveryTime rating");

    // 2. Fetch HomeChefs querying the nested object field (deliveryTime.max)
    const homeChef = await HomeChef.find({
      $or: [
        { "deliveryTime.max": { $lte: 20 } },
        { "deliveryTime.min": { $lte: 20 } }
      ]
    }).select("name logo _id coverImage deliveryTime rating");

    // 3. Merge arrays
    const fastDeliveryRestaurants = [...restaurant, ...homeChef];

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

    const fields = [
      "name",
      "description",
      "logo",
      "coverImage",
      "cuisines",
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
    console.log("Status",status);
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
      { new: true }
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