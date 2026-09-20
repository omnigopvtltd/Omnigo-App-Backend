const express = require("express");
const router = express.Router();
const {
  getSearchInitialData,
  searchAndFilter,
  getRecentSearches,
  removeRecentSearch,
  clearAllRecentSearches,
} = require("../controllers/searchController");
const auth = require("../middleware/authMiddleware");

// Optional Auth middleware helper
const optionalAuth = (req, res, next) => {
  if (req.headers.authorization) {
    return auth(req, res, next);
  }
  next();
};

// Initial search screen feed (Popular Cuisines + Sponsored + Recent Searches)
router.get("/initial", optionalAuth, getSearchInitialData);

// Main search & multi-filter API endpoint
router.get("/filter", optionalAuth, searchAndFilter);
router.get("/", optionalAuth, searchAndFilter);

// Recent searches management
router.get("/recent", auth, getRecentSearches);
router.delete("/recent/remove", auth, removeRecentSearch);
router.delete("/recent/clear-all", auth, clearAllRecentSearches);

module.exports = router;