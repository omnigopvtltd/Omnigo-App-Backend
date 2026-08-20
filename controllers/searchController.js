const Restaurant = require("../models/Restaurant");
const HomeChef = require("../models/HomeChef");
const Product = require("../models/Product");
const UserSearchHistory = require("../models/UserSearchHistory");
// Helper function to handle async search saving safely without blocking API response
const saveSearchQueryHelper = async (userId, queryText, totalResults) => {
  console.log("get search", userId, queryText, totalResults)
  if (!userId || !queryText || typeof queryText !== "string") return;
  const trimmed = queryText.trim();
  if (!trimmed) return;

  try {
    let history = await SearchHistory.findOne({ userId });

    if (!history) {
      await SearchHistory.create({
        userId,
        search: [trimmed],
        resultCount: totalResults,
      });
    } else {
      // Remove duplicate (case-insensitive) & place search at beginning of array
      let updatedSearches = history.search.filter(
        (s) => s.toLowerCase() !== trimmed.toLowerCase()
      );
      updatedSearches.unshift(trimmed);

      // Keep maximum 10 recent searches
      if (updatedSearches.length > 10) {
        updatedSearches = updatedSearches.slice(0, 10);
      }

      history.search = updatedSearches;
      history.resultCount = totalResults;
      await history.save();
    }
  } catch (err) {
    console.error("SAVE SEARCH QUERY HELPER ERROR:", err.message);
  }
};

// ========================================================
// 1. GET INITIAL SEARCH PAGE DATA
// ========================================================
exports.getSearchInitialData = async (req, res) => {
  try {
    // Fetch featured/sponsored restaurants & home chefs
    const sponsoredRestaurants = await Restaurant.find({
      isSponsored: true,
      status: "approved",
    })
      .select("name logo rating isFeatured")
      .limit(5);

    const sponsoredChefs = await HomeChef.find({
      isSponsored: true,
      status: "approved",
    })
      .select("name logo rating isFeatured")
      .limit(5);

    const sponsored = [...sponsoredRestaurants, ...sponsoredChefs];

    // Popular cuisine chips
    const popularCuisines = await Product.find({type: "popular"}).select("id category image");
    // const popularCuisines = [
    //   { name: "Burger", image: "https://res.cloudinary.com/omnigo/image/upload/v1/cuisines/burger.png" },
    //   { name: "Pizza", image: "https://res.cloudinary.com/omnigo/image/upload/v1/cuisines/pizza.png" },
    //   { name: "Crispy", image: "https://res.cloudinary.com/omnigo/image/upload/v1/cuisines/crispy.png" },
    //   { name: "Pasta", image: "https://res.cloudinary.com/omnigo/image/upload/v1/cuisines/pasta.png" },
    // ];

    // Optional: Fetch recent searches if user is authenticated
    let recentSearches = [];
    if (req.user && req.user.id) {
      const history = await SearchHistory.findOne({ userId: req.user.id }).lean();
      recentSearches = history?.search || [];
    }

    return res.status(200).json({
      success: true,
      popularCuisines,
      sponsored,
      recentSearches, // Added field without breaking popularCuisines or sponsored
    });
  } catch (err) {
    console.error("GET SEARCH INITIAL DATA ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ========================================================
// 2. UNIFIED GLOBAL SEARCH & FILTER API
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

    // Distance Geo Near query setup
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

    const userId = req.user?.id || req.user?._id;
    // Non-blocking auto-save search term if user is logged in
    // console.log("Search",userId )
    if (userId && query) {
      // console.log("Search",userId, query )
      saveSearchQueryHelper(req.user.id, query, places.length + products.length);
    }

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

// ========================================================
// 1. HELPER: SAVE OR UPDATE SEARCH QUERY
// Call this inside searchAndFilter or where search is executed
// ========================================================
exports.saveSearchQuery = async (userId, queryText, resultCount = 0) => {
  if (!userId || !queryText || typeof queryText !== "string") return;

  const trimmedQuery = queryText.trim();
  if (!trimmedQuery) return;

  try {
    let history = await SearchHistory.findOne({ userId });

    if (!history) {
      // Create new document if user has no search history yet
      await SearchHistory.create({
        userId,
        search: [trimmedQuery],
        resultCount,
      });
    } else {
      // Remove duplicate if it already exists (case-insensitive check)
      let updatedSearches = history.search.filter(
        (s) => s.toLowerCase() !== trimmedQuery.toLowerCase()
      );

      // Add to front of array
      updatedSearches.unshift(trimmedQuery);

      // Limit to 10 most recent searches
      if (updatedSearches.length > 10) {
        updatedSearches = updatedSearches.slice(0, 10);
      }

      history.search = updatedSearches;
      history.resultCount = resultCount;
      await history.save();
    }
  } catch (err) {
    console.error("SAVE SEARCH QUERY ERROR:", err.message);
  }
};

// ========================================================
// 2. GET USER'S RECENT SEARCHES
// ========================================================
exports.getRecentSearches = async (req, res) => {
  try {
    const history = await UserSearchHistory.findOne({ userId: req.user.id })
      .select("search resultCount updatedAt")
      .lean();

    return res.status(200).json({
      success: true,
      data: history?.search || [],
      resultCount: history?.resultCount || 0,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ========================================================
// 3. REMOVE SINGLE RECENT SEARCH ITEM
// ========================================================
exports.removeRecentSearch = async (req, res) => {
  try {
    const { searchQuery } = req.body;

    if (!searchQuery) {
      return res.status(400).json({
        success: false,
        message: "Please provide searchQuery to remove",
      });
    }

    // Atomic $pull to remove query from search array
    const updatedHistory = await SearchHistory.findOneAndUpdate(
      { userId: req.user.id },
      { $pull: { search: searchQuery.trim() } },
      { new: true }
    );

    if (!updatedHistory) {
      return res.status(404).json({
        success: false,
        message: "Search history not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Search item removed successfully",
      data: updatedHistory.search,
    });
  } catch (err) {
    console.error("REMOVE RECENT SEARCH ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ========================================================
// 4. CLEAR ALL RECENT SEARCHES
// ========================================================
exports.clearAllRecentSearches = async (req, res) => {
  try {
    await SearchHistory.findOneAndDelete({ userId: req.user.id });

    return res.status(200).json({
      success: true,
      message: "All search history cleared successfully",
      data: [],
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};