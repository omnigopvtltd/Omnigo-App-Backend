// src/controllers/location.controller.js
const locationiq = require("../services/locationService");
const fareService = require("../services/fare");
// const { AppError } = require("../utils/AppError");
const { parseLat, parseLon, assertInPakistan } = require("../utils/validate");

const MIN_QUERY_LEN = 3;   // 1-2 harf par request nahi: credits bachte han
const MAX_QUERY_LEN = 120;

const handle = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (err) {
    // if (err instanceof AppError) {
    //   return res.status(err.status).json({ success: false, code: err.code, message: err.message });
    // }
    console.error("[Location] unexpected error:", err);
    return res.status(500).json({ success: false, code: "INTERNAL", message: "Kuch ghalat ho gaya" });
  }
};

// GET /api/v1/location/autocomplete?query=...&limit=5
exports.autocomplete = handle(async (req, res) => {
  const query = typeof req.query.query === "string" ? req.query.query.trim() : "";
  if (!query) throw new Error(400, "VALIDATION", "query required ha");
  if (query.length > MAX_QUERY_LEN) throw new Error(400, "VALIDATION", `query ${MAX_QUERY_LEN} characters se chhoti honi chahiye`);

  let limit = 5;
  if (req.query.limit !== undefined) {
    limit = Number(req.query.limit);
    if (!Number.isInteger(limit) || limit < 1 || limit > 10) throw new Error(400, "VALIDATION", "limit 1 se 10 ke darmiyan hona chahiye");
  }

  // Chhoti query: error nahi, bas khali list (UI ko tootna nahi chahiye)
  if (query.length < MIN_QUERY_LEN) return res.json({ success: true, data: [] });

  const data = await locationiq.autocomplete(query, limit);
  return res.json({ success: true, data });
});

// GET /api/v1/location/reverse-geocode?lat=..&lon=..
exports.reverseGeocode = handle(async (req, res) => {
  const lat = parseLat(req.query.lat);
  const lon = parseLon(req.query.lon);
  assertInPakistan(lat, lon);

  const data = await locationiq.reverseGeocode(lat, lon);
  if (!data) throw new Error(404, "NO_ADDRESS", "Is jagah ka address nahi mila. Pin thora hila kar dekhein.");
  return res.json({ success: true, data });
});

// POST /api/v1/orders/calculate-fare
exports.calculateFare = handle(async (req, res) => {
  const b = req.body || {};
  const from = { lat: parseLat(b.pickupLat, "pickupLat"), lon: parseLon(b.pickupLng, "pickupLng") };
  const to = { lat: parseLat(b.dropoffLat, "dropoffLat"), lon: parseLon(b.dropoffLng, "dropoffLng") };
  assertInPakistan(from.lat, from.lon);
  assertInPakistan(to.lat, to.lon);

  
  const data = await fareService.calculateFare(from, to);
  console.log(data);
  return res.json({ success: true, data });
});