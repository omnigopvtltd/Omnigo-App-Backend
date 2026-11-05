// const axios = require('axios');

// const LOCATIONIQ_API_KEY = process.env.LOCATIONIQ_API_KEY;

// /**
//  * Get address from Latitude & Longitude (Reverse Geocoding)
//  */
// exports.getAddressFromCoordinates = async (lat, lng) => {
//   try {
//     const url = `https://us1.locationiq.com/v1/reverse?key=${LOCATIONIQ_API_KEY}&lat=${lat}&lon=${lng}&format=json`;
//     const response = await axios.get(url);

//     if (response.data && response.data.address) {
//       const addr = response.data.address;
//       const formattedAddress = response.data.display_name || "Unknown Address";
//       const city = addr.city || addr.town || addr.village || addr.county || "Chakwal";
      
//       return {
//         success: true,
//         address: formattedAddress,
//         city: city,
//         country: addr.country || "Pakistan",
//         postcode: addr.postcode || "48800"
//       };
//     }

//     return { success: false, message: "No address found for these coordinates" };
//   } catch (err) {
//     console.error("LOCATIONIQ REVERSE GEOCODING ERROR:", err.message);
//     return { success: false, message: "Geocoding service unavailable" };
//   }
// };

// /**
//  * Calculate Distance & ETA between Vendor Branch and User Address
//  */
// exports.calculateRouteMetrics = async (origin, destination) => {
//   try {
//     // origin: { lat, lng }, destination: { lat, lng }
//     const url = `https://us1.locationiq.com/v1/directions/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?key=${LOCATIONIQ_API_KEY}&overview=false`;
//     const response = await axios.get(url);

//     if (response.data && response.data.routes && response.data.routes.length > 0) {
//       const route = response.data.routes[0];
//       const distanceKm = (route.distance / 1000).toFixed(2); // meters to KM
//       const durationMin = Math.ceil(route.duration / 60);     // seconds to Minutes

//       return {
//         success: true,
//         distanceKm: Number(distanceKm),
//         durationMin: Number(durationMin)
//       };
//     }

//     return { success: false, distanceKm: 0, durationMin: 0 };
//   } catch (err) {
//     console.error("LOCATIONIQ ROUTE METRICS ERROR:", err.message);
//     return { success: false, distanceKm: 0, durationMin: 0 };
//   }
// };

// ========================================================

// src/services/locationiq.service.js
// LocationIQ ke saath SARA kaam yahan: key sirf server par, cache, rate-limit protection, error mapping.
const { TtlCache } = require("../utils/ttlCache");
// const { AppError } = require("../utils/AppError");

const cfg = () => ({
  key: process.env.LOCATIONIQ_API_KEY,
  base: (process.env.LOCATIONIQ_BASE_URL || "https://api.locationiq.com/v1").replace(/\/$/, ""),
  country: process.env.LOCATIONIQ_COUNTRY || "pk",
  timeoutMs: Number(process.env.LOCATIONIQ_TIMEOUT_MS || 6000),
  // Free plan: 2 req/sec aur 60 req/min (poore account ke liye, har user ke liye nahi). Paid plan par env se barhayen, 0 = off
  rps: Number(process.env.LOCATIONIQ_RPS ?? 2),
  rpm: Number(process.env.LOCATIONIQ_RPM ?? 60),
  maxWaitMs: Number(process.env.LOCATIONIQ_MAX_WAIT_MS || 1500),
});

// LocationIQ free plan response ko 48 ghante tak cache karne ki ijazat deta ha; hum is se kam rakhte han
const autocompleteCache = new TtlCache({ ttlMs: 10 * 60 * 1000, max: 5000 });
const reverseCache = new TtlCache({ ttlMs: 24 * 60 * 60 * 1000, max: 5000 });
const routeCache = new TtlCache({ ttlMs: 6 * 60 * 60 * 1000, max: 5000 });
const inflight = new Map(); // ek jesi parallel requests ek hi upstream call share karen

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------- upstream throttle
let nextSlot = 0;
let minuteWindow = [];
async function acquireSlot() {
  const { rps, rpm, maxWaitMs } = cfg();
  const now = Date.now();
  if (rpm > 0) {
    minuteWindow = minuteWindow.filter((t) => now - t < 60000);
    if (minuteWindow.length >= rpm) throw new AppError(503, "GEO_BUSY", "Location service par rush ha, thori der baad try karein");
  }
  if (rps > 0) {
    const slot = Math.max(now, nextSlot);
    if (slot - now > maxWaitMs) throw new AppError(503, "GEO_BUSY", "Location service par rush ha, thori der baad try karein");
    nextSlot = slot + 1000 / rps;
    if (slot > now) await sleep(slot - now);
  }
  if (rpm > 0) minuteWindow.push(Date.now());
}

// ---------------------------------------------------------------- HTTP
async function upstream(path, params = {}, { retried = false } = {}) {
  const { key, base, timeoutMs } = cfg();
  if (!key) {
    console.error("[LocationIQ] LOCATIONIQ_API_KEY set nahi ha");
    throw new Error(500, "GEO_CONFIG", "Location service configure nahi ha");
  }
  await acquireSlot();

  const url = new URL(base + path);
  url.searchParams.set("key", key);
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null) url.searchParams.set(k, String(v));

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: "application/json" } });

    if (res.status === 404) return null; // "Unable to geocode": koi result nahi (error nahi)
    if (res.status === 429) {
      const body = await res.json().catch(() => ({}));
      if (!retried && /second/i.test(body?.error || "")) {
        await sleep(700);
        return upstream(path, params, { retried: true });
      }
      console.error(`[LocationIQ] 429 ${body?.error || ""} on ${path}`);
      throw new AppError(503, "GEO_BUSY", "Location service par rush ha, thori der baad try karein");
    }
    if (res.status === 401 || res.status === 403) {
      console.error(`[LocationIQ] auth error ${res.status} on ${path} - API key / token restrictions check karein`);
      throw new AppError(502, "GEO_UPSTREAM", "Location service abhi available nahi");
    }
    if (!res.ok) {
      console.error(`[LocationIQ] HTTP ${res.status} on ${path}`);
      throw new AppError(502, "GEO_UPSTREAM", "Location service abhi available nahi");
    }
    return await res.json();
  } catch (err) {
    if (err instanceof AppError) throw err;
    if (err.name === "AbortError") throw new AppError(504, "GEO_TIMEOUT", "Location service ne jawab nahi diya");
    console.error(`[LocationIQ] network error on ${path}: ${err.message}`);   // URL log nahi karte (key hoti ha)
    throw new AppError(502, "GEO_UPSTREAM", "Location service abhi available nahi");
  } finally {
    clearTimeout(timer);
  }
}

function cached(cache, key, loader) {
  const hit = cache.get(key);
  if (hit !== undefined) return Promise.resolve(hit);
  if (inflight.has(key)) return inflight.get(key);
  const p = loader()
    .then((v) => { cache.set(key, v); return v; })
    .finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

// ---------------------------------------------------------------- mappers
function pickAddress(a = {}) {
  const street = [a.house_number, a.road].filter(Boolean).join(" ") || a.name || a.neighbourhood || "";
  return {
    street,
    suburb: a.suburb || a.neighbourhood || a.quarter || "",
    city: a.city || a.town || a.village || a.county || a.state_district || "",
    state: a.state || "",
    postal_code: a.postcode || "",
    country: a.country || "",
  };
}

function mapSuggestion(p) {
  const lat = Number(p.lat), lon = Number(p.lon);
  if (!p.place_id || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const display = String(p.display_name || "");
  const [first, ...rest] = display.split(",");
  return {
    place_id: String(p.place_id),
    display_name: display,
    main_text: p.display_place || p.address?.name || first?.trim() || display,
    secondary_text: p.display_address || rest.join(",").trim(),
    lat,
    lon,
    address: pickAddress(p.address),
  };
}

// ---------------------------------------------------------------- public API
async function autocomplete(query, limit = 5) {
  const q = query.trim().replace(/\s+/g, " ");
  const { country } = cfg();
  return cached(autocompleteCache, `ac:${country}:${limit}:${q.toLowerCase()}`, async () => {
    const data = await upstream("/autocomplete", {
      q, countrycodes: country, limit, dedupe: 1, normalizecity: 1, "accept-language": "en",
    });
    return Array.isArray(data) ? data.map(mapSuggestion).filter(Boolean) : [];
  });
}

async function reverseGeocode(lat, lon) {
  const key = `rv:${lat.toFixed(5)}:${lon.toFixed(5)}`;           // ~1 meter ki accuracy par cache
  return cached(reverseCache, key, async () => {
    const data = await upstream("/reverse", { lat, lon, format: "json", addressdetails: 1, normalizecity: 1, "accept-language": "en" });
    if (!data || data.error) return null;
    return {
      place_id: String(data.place_id || ""),
      display_name: data.display_name || "",
      lat: Number(data.lat) || lat,
      lon: Number(data.lon) || lon,
      address: pickAddress(data.address),
    };
  });
}

// LocationIQ Directions (usi key par, free plan mein routing bhi shamil ha). NOTE: coordinates lon,lat order mein
async function drivingRoute(from, to) {
  const key = `rt:${from.lat.toFixed(4)},${from.lon.toFixed(4)};${to.lat.toFixed(4)},${to.lon.toFixed(4)}`;
  return cached(routeCache, key, async () => {
    const data = await upstream(`/directions/driving/${from.lon},${from.lat};${to.lon},${to.lat}`, {
      overview: "false", steps: "false", alternatives: "false",
    });
    const r = data?.routes?.[0];
    if (!r || !Number.isFinite(r.distance)) return null;
    return { distanceM: r.distance, durationS: Number(r.duration) || 0 };
  });
}

function _resetForTests() {
  [autocompleteCache, reverseCache, routeCache].forEach((c) => c.clear());
  inflight.clear(); nextSlot = 0; minuteWindow = [];
}

module.exports = { autocomplete, reverseGeocode, drivingRoute, _resetForTests };