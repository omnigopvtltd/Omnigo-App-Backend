// src/routes/fare.routes.js   ->  app.use("/api/v1/orders", require("./routes/fare.routes"));
// NOTE: apne existing orders router se PEHLE mount karein, warna "/:id" jesa route "calculate-fare" ko pakar sakta ha.
const express = require("express");
const rateLimit = require("express-rate-limit");
const auth = require("../middleware/authMiddleware");
const c = require("../controllers/locationController");

const router = express.Router();
const limiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => String(req.user?.id || req.ip),
  message: { success: false, code: "RATE_LIMITED", message: "Bohat zyada requests, thori der baad try karein" },
});

router.post("/calculate-fare", auth, limiter, c.calculateFare);

module.exports = router;