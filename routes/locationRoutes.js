// src/routes/location.routes.js   ->  app.use("/api/v1/location", require("./routes/location.routes"));
const express = require("express");
const rateLimit = require("express-rate-limit");
const auth  = require("../middleware/authMiddleware");        // <- apna auth middleware (createOrder wala)
const c = require("../controllers/locationController");

const router = express.Router();

// Per-user limit (auth ke baad req.user.id mojood hota ha). LocationIQ credits poore account ke han, is liye zaroori.
const limiter = (limit) =>
  rateLimit({
    windowMs: 60 * 1000,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => String(req.user?.id || req.ip),
    message: { success: false, code: "RATE_LIMITED", message: "Bohat zyada requests, thori der baad try karein" },
  });

//   const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 100, // Limit each IP to 100 requests per windowMs
//   standardHeaders: true,
//   legacyHeaders: false,
//   message: {
//     success: false,
//     code: "TOO_MANY_REQUESTS",
//     message: "Bohat zyada requests aa gayi hain, thori der baad koshish karein.",
//   },
// });

router.use(auth);
router.get("/autocomplete", limiter(40), c.autocomplete);
router.get("/reverse-geocode", limiter(30), c.reverseGeocode);

module.exports = router;