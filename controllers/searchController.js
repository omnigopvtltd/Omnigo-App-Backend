const Restaurant = require("../models/Restaurant");
const HomeChef = require("../models/HomeChef");
const Product = require("../models/Product");
const UserSearchHistory = require("../models/UserSearchHistory"); // Correct Model Import
const Vendor = require("../models/Vendor");
const VendorBranch = require("../models/VendorBranch");

// Helper function to handle async search saving safely without blocking API response
const saveSearchQueryHelper = async (userId, queryText, totalResults) => {
  if (!userId || !queryText || typeof queryText !== "string") return;
  const trimmed = queryText.trim();
  if (!trimmed) return;

  try {
    let history = await UserSearchHistory.findOne({ userId });

    if (!history) {
      await UserSearchHistory.create({
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
// 1. GET INITIAL SEARCH PAGE DATA (Cuisines + Sponsored + Recent)
// ========================================================
exports.getSearchInitialData = async (req, res) => {
  try {
    // Fetch featured/sponsored restaurants
    const sponsoredVendors = await Vendor.find({
      isSponsored: true,
      status: "approved",
    })
      .select("businessName logo rating isFeatured")
      .limit(5);

    const sponsored = [...sponsoredVendors];

    // Popular cuisine chips for initial view
    const popularCuisines = await Product.find({ type: "popular" })
      .select("id name category subcategory image")
      .limit(8);

    // Fetch recent searches if user is authenticated
    let recentSearches = [];
    const userId = req.user?.id || req.user?._id;
    if (userId) {
      const history = await UserSearchHistory.findOne({ userId }).lean();
      recentSearches = history?.search || [];
    }

    return res.status(200).json({
      success: true,
      popularCuisines,
      sponsored,
      recentSearches,
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
      query, // Search string
      category,
      subcategory,
      popular,
      fastDelivery,
      freeDelivery,
      discount20,
      priceSort, // "low_to_high" | "high_to_low"
      rating, // "top_rated" | "4.5" | "4.0"
      maxDistance, // in km: 3, 5
      userLng,
      userLat,
    } = req.query;

    // BUILD VENDOR / PLACE QUERY
    let placeQuery = { status: "approved" };

    if (query) {
      placeQuery.$or = [
        { businessName: { $regex: query, $options: "i" } },
        { popular: { $regex: query, $options: "i" } },
      ];
    }

    if (fastDelivery === "true") {
      placeQuery["deliveryTime.max"] = { $lte: 30 };
    }

    if (freeDelivery === "true") {
      placeQuery.deliveryFee = 0;
    }

    
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
    
    // BUILD PRODUCT FILTER QUERY
    let productQuery = { isAvailable: true };
    
    if (rating === "top_rated" || rating === "4.5") {
      productQuery["rating.average"] = { $gte: 4.5 };
    } else if (rating === "4.0") {
      productQuery["rating.average"] = { $gte: 4.0 };
    } else if (rating > "0.0" && rating < "5.0" || rating > "0" && rating < "6") {
      productQuery["rating.average"] = { $gte: Number(rating) }
    }
    if (query) {
      productQuery.$or = [
        { name: { $regex: query, $options: "i" } },
        { category: { $regex: query, $options: "i" } },
        { subcategory: { $regex: query, $options: "i" } },
        { type: { $regex: query, $options: "i" } },
        { "tags.tagName": { $regex: query, $options: "i" } },
      ];
    }

    if (popular) {
      productQuery.type = { $regex: popular, $options: "i" };
    }

    if (category) {
      productQuery.category = category;
    }
    if (subcategory) {
      productQuery.subcategory = subcategory;
    }

    if (discount20 === "true") {
      productQuery.discountPrice = { $ne: null };
    }

    if (rating === "top_rated" || rating === "4.5") {
      productQuery["rating.average"] = { $gte: 4.5 };
    } else if (rating === "4.0") {
      productQuery["rating.average"] = { $gte: 4.0 };
    } else if (Number(rating) > 0) {
      productQuery["rating.average"] = { $gte: Number(rating) };
    }

    // Price Sorting
    let sortOptions = { createdAt: -1 };
    if (priceSort === "low_to_high") {
      sortOptions = { price: 1 };
    } else if (priceSort === "high_to_low") {
      sortOptions = { price: -1 };
    }

    // EXECUTE PARALLEL QUERIES
    const [vendors, vendorBranches, products] = await Promise.all([
      Vendor.find(placeQuery)
        .select("businessName logo coverImage rating deliveryTime deliveryFee isFeatured")
        .sort(sortOptions),
      VendorBranch.find(placeQuery)
        .select("branchName address area city country isOpen isRushMode")
        .sort(sortOptions),
      Product.find(productQuery)
        .populate("vendorId", "businessName logo rating")
        .sort(sortOptions),
    ]);

    const places = [...vendors, ...vendorBranches];

    // Save recent search if user is logged in & query exists
    const userId = req.user?.id || req.user?._id;
    if (userId && query) {
      saveSearchQueryHelper(userId, query, places.length + products.length);
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
// 3. GET USER'S RECENT SEARCHES
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
// 4. REMOVE SINGLE RECENT SEARCH ITEM
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

    const updatedHistory = await UserSearchHistory.findOneAndUpdate(
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
// 5. CLEAR ALL RECENT SEARCHES
// ========================================================
exports.clearAllRecentSearches = async (req, res) => {
  try {
    await UserSearchHistory.findOneAndDelete({ userId: req.user.id });

    return res.status(200).json({
      success: true,
      message: "All search history cleared successfully",
      data: [],
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};