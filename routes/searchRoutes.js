const express = require("express");
const router = express.Router();
const {
  getSearchInitialData,
  searchAndFilter,
} = require("../controllers/searchController");

// Initial search screen feed (Cuisines + Sponsored)
router.get("/initial", getSearchInitialData);

// Main search & multi-filter API endpoint
router.get("/filter", searchAndFilter);

module.exports = router;