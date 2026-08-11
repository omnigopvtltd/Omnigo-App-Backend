const Restaurant = require("../models/Restaurant");
const HomeChef = require("../models/HomeChef");
const Product = require("../models/Product");

// ========================================================
// 1. GET INITIAL SEARCH PAGE DATA
// Popular Cuisines, Sponsored Places, and Recent Search skeleton
// ========================================================
exports.getSearchInitialData = async (req, res) => {
  try {
    // Fetch featured/sponsored restaurants & home chefs
    const sponsoredRestaurants = await Restaurant.find({
      isFeatured: true,
      status: "approved",
    })
      .select("name logo rating isFeatured")
      .limit(5);

    const sponsoredChefs = await HomeChef.find({
      isFeatured: true,
      status: "approved",
    })
      .select("name logo rating isFeatured")
      .limit(5);

    const sponsored = [...sponsoredRestaurants, ...sponsoredChefs];

    // Popular cuisine chips hardcoded/queried
    const popularCuisines = [
      { name: "Burger", image: "https://res.cloudinary.com/omnigo/image/upload/v1/cuisines/burger.png" },
      { name: "Pizza", image: "https://res.cloudinary.com/omnigo/image/upload/v1/cuisines/pizza.png" },
      { name: "Crispy", image: "https://res.cloudinary.com/omnigo/image/upload/v1/cuisines/crispy.png" },
      { name: "Pasta", image: "https://res.cloudinary.com/omnigo/image/upload/v1/cuisines/pasta.png" },
    ];

    return res.status(200).json({
      success: true,
      popularCuisines,
      sponsored,
    });
  } catch (err) {
    console.error("GET SEARCH INITIAL DATA ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ========================================================
// 2. UNIFIED GLOBAL SEARCH & FILTER API
// Supports keyword search, delivery, offers, price sorting,
// ratings, and distance filtering.
// ========================================================
exports.searchAndFilter = async (req, res) => {
  try {
    const {
      query,            // Search string (e.g., "Pizza", "Burger")
      category,         // Optional category filter
      cuisine,          // Optional cuisine filter
      fastDelivery,     // true / false
      freeDelivery,     // true / false
      discount20,       // true / false (20% Off)
      priceSort,        // "low_to_high" | "high_to_low"
      rating,           // "top_rated" | "4.5" | "4.0"
      maxDistance,      // in km: 3, 5, or undefined
      userLng,          // User's current longitude
      userLat,          // User's current latitude
    } = req.query;

    // ----------------------------------------------------
    // BUILD RESTAURANT / HOME CHEF FILTER QUERY
    // ----------------------------------------------------
    let placeQuery = { status: "approved" };

    if (query) {
      placeQuery.$or = [
        { name: { $regex: query, $options: "i" } },
        { cuisines: { $regex: query, $options: "i" } },
      ];
    }

    if (cuisine) {
      placeQuery.cuisines = { $regex: cuisine, $options: "i" };
    }

    if (fastDelivery === "true") {
      placeQuery["deliveryTime.max"] = { $lte: 30 };
    }

    if (freeDelivery === "true") {
      placeQuery.deliveryFee = 0;
    }

    // Rating Filter
    if (rating === "top_rated" || rating === "4.5") {
      placeQuery["rating.average"] = { $gte: 4.5 };
    } else if (rating === "4.0") {
      placeQuery["rating.average"] = { $gte: 4.0 };
    }

    // Distance Geo Near query setup (if coordinates provided)
    if (maxDistance && userLng && userLat) {
      const radiusInMeters = Number(maxDistance) * 1000;
      placeQuery["address.location"] = {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [parseFloat(userLng), parseFloat(userLat)],
          },
          $maxDistance: radiusInMeters,
        },
      };
    }

    // ----------------------------------------------------
    // BUILD PRODUCT FILTER QUERY
    // ----------------------------------------------------
    let productQuery = { isAvailable: true };

    if (query) {
      productQuery.$or = [
        { name: { $regex: query, $options: "i" } },
        { category: { $regex: query, $options: "i" } },
        { subcategory: { $regex: query, $options: "i" } },
        { "tags.tagName": { $regex: query, $options: "i" } },
      ];
    }

    if (category) {
      productQuery.category = category;
    }

    if (discount20 === "true") {
      // Items with a discount field
      productQuery.discountPrice = { $ne: null };
    }

    if (rating === "top_rated" || rating === "4.5") {
      productQuery["rating.average"] = { $gte: 4.5 };
    } else if (rating === "4.0") {
      productQuery["rating.average"] = { $gte: 4.0 };
    }

    // Price Sorting
    let sortOptions = { createdAt: -1 };
    if (priceSort === "low_to_high") {
      sortOptions = { price: 1 };
    } else if (priceSort === "high_to_low") {
      sortOptions = { price: -1 };
    }

    // ----------------------------------------------------
    // EXECUTE PARALLEL QUERIES
    // ----------------------------------------------------
    const [restaurants, homeChefs, products] = await Promise.all([
      Restaurant.find(placeQuery)
        .select("name logo coverImage rating deliveryTime deliveryFee cuisines isFeatured")
        .sort(sortOptions),
      HomeChef.find(placeQuery)
        .select("name logo coverImage rating deliveryTime deliveryFee cuisines isFeatured")
        .sort(sortOptions),
      Product.find(productQuery)
        .populate("restaurantId", "name logo rating")
        .populate("homeChefId", "name logo rating")
        .sort(sortOptions),
    ]);

    const places = [...restaurants, ...homeChefs];

    return res.status(200).json({
      success: true,
      summary: {
        totalPlaces: places.length,
        totalProducts: products.length,
      },
      results: {
        places,
        products,
      },
    });
  } catch (err) {
    console.error("SEARCH & FILTER ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};