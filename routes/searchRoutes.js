const express = require("express");
const router = express.Router();
const {
  getSearchInitialData,
  searchAndFilter,
  getRecentSearches,
  removeRecentSearch,
  clearAllRecentSearches,
} = require("../controllers/searchController");
const auth= require("../middleware/authMiddleware");

// Initial search screen feed (Cuisines + Sponsored)
router.get("/initial", getSearchInitialData);
router.get("/", searchAndFilter);

// Main search & multi-filter API endpoint
router.get("/filter", searchAndFilter);

router.get("/recent", auth, getRecentSearches);
router.delete("/recent/remove", auth, removeRecentSearch);
router.delete("/recent/clear-all", auth, clearAllRecentSearches);

module.exports = router;