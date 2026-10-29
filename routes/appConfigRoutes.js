// const express = require("express");
// const router = express.Router();
// const {
//   checkAppVersion,
//   updateAppVersionConfig
// } = require("../controllers/appConfigController");


// // Route example
// router.get("/app/version-check", checkAppVersion);
// router.post("/app/app-version", updateAppVersionConfig);

// module.exports = router;

// // {
// //   "appType": "user",
// //   "latestVersion": "1.1.0",
// //   "minRequiredVersion": "1.0.0",
// //   "updateTitle": "New UI & Performance Fixes",
// //   "updateMessage": "We added new features and improved performance. Please update for a better experience."
// // }

// // {
// //   "appType": "user",
// //   "latestVersion": "1.1.0",
// //   "minRequiredVersion": "1.1.0",
// //   "forceUpdateMessage": "This version includes critical updates. You must update to continue using the app."
// // }


////////////////////////////////////////////////////////////////////

const express = require("express");
const rateLimit = require("express-rate-limit"); // npm i express-rate-limit
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/rolemiddleware");

const {
  checkAppVersion,
  updateAppVersionConfig,
} = require("../controllers/appConfigController");

// IMPORTANT: replace this import with YOUR existing auth middleware.
// `protect` must verify the token, `adminOnly` must allow admins only.
const { protect, adminOnly } = require("../middleware/authMiddleware");

// Public endpoint: every app launch calls it, so protect it from abuse.
const versionCheckLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per IP per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, code: "RATE_LIMITED", message: "Too many requests" },
});

router.get("/app/version-check", versionCheckLimiter, checkAppVersion);

// Admin only. Without auth anyone could force-update or shut down every user.
router.put("/app/app-config", auth, updateAppVersionConfig);

module.exports = router;

// In app.js / server.js mount it under a versioned prefix:
//   app.use("/api/v1", require("./routes/appConfigRoutes"));
// Final URLs:
//   GET /api/v1/app/version-check
//   PUT /api/v1/admin/app-config
// Never rename or remove these URLs or response keys once an app is published.
