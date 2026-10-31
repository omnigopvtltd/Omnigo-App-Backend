const distance = require("@turf/distance").default;
const { point } = require("@turf/helpers");
const locationiq = require("./locationService");
// const { Error } = require("../utils/Error");

const num = (name, def) => (process.env[name] !== undefined ? Number(process.env[name]) : def);

// Pricing model: ENV se (code change ke baghair badal sakte han). DEFAULTS PLACEHOLDER han - business se confirm karein.
const pricing = () => ({
  currency: process.env.FARE_CURRENCY || "PKR",
  baseFare: num("FARE_BASE", 100),        // pehle baseKm ka kiraya
  baseKm: num("FARE_BASE_KM", 1),
  perKm: num("FARE_PER_KM", 25),          // baseKm ke baad har km
  minFare: num("FARE_MIN", 100),
  roundTo: num("FARE_ROUND_TO", 10),      // upar ki taraf 10 PKR par round
  maxKm: num("FARE_MAX_KM", 200),         // 40 se barha kar 200 kar diya taake long distance test ho sake
  roadFactor: num("FARE_ROAD_FACTOR", 1.35), // routing fail ho to seedhi line x yeh factor (estimate)
});

async function osrmRoute(from, to) {                     // sirf APNA OSRM server (public demo commercial use ke liye allowed nahi)
  const base = process.env.OSRM_URL;
  if (!base) return null;
  const url = `${base.replace(/\/$/, "")}/route/v1/driving/${from.lon},${from.lat};${to.lon},${to.lat}?overview=false`;
  const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
  if (!res.ok) throw new Error(`OSRM HTTP ${res.status}`);
  const data = await res.json();
  const r = data.code === "Ok" ? data.routes?.[0] : null;
  return r ? { distanceM: r.distance, durationS: r.duration } : null;
}

async function getDistance(from, to) {
  const providers = (process.env.ROUTING_PROVIDERS || "locationiq").split(",").map((s) => s.trim()).filter(Boolean);
  for (const p of providers) {
    try {
      const r = p === "osrm" ? await osrmRoute(from, to) : p === "locationiq" ? await locationiq.drivingRoute(from, to) : null;
      if (r) return { ...r, source: p, road: true };
    } catch (e) {
      console.error(`[Fare] routing provider "${p}" failed: ${e.message}`);
    }
  }
  if (process.env.ALLOW_ESTIMATED_FARE === "false") {
    throw new Error(503, "ROUTING_UNAVAILABLE", "Distance abhi calculate nahi ho saki, thori der baad try karein");
  }
  // Fallback: Turf se seedhi line (as-the-crow-flies) x road factor
  const straightKm = distance(point([from.lon, from.lat]), point([to.lon, to.lat]), { units: "kilometers" });
  const { roadFactor } = pricing();
  
  // ✅ Fixed syntax error here (* operator added)
  return { distanceM: straightKm * 1000 * roadFactor, durationS: 0, source: "turf-estimate", road: false };
}

function computeDeliveryFee(distanceKm) {
  const p = pricing();
  const billableKm = Math.ceil(distanceKm * 10) / 10;           // 0.1 km tak round-up
  const extraKm = Math.max(0, billableKm - p.baseKm);
  const raw = p.baseFare + extraKm * p.perKm;
  const withMin = Math.max(raw, p.minFare);
  const fare = p.roundTo > 0 ? Math.ceil(withMin / p.roundTo) * p.roundTo : Math.round(withMin);
  return {
    fare,
    currency: p.currency,
    breakdown: { base_fare: p.baseFare, base_km: p.baseKm, extra_km: Number(extraKm.toFixed(1)), per_km: p.perKm, min_fare: p.minFare },
  };
}

async function calculateFare(from, to) {
  const d = await getDistance(from, to);
  const distanceKm = d.distanceM / 1000;
  const { maxKm } = pricing();
  
  if (distanceKm > maxKm) {
    const err = new Error(`Delivery sirf ${maxKm} km तक available ha`);
    err.statusCode = 422;
    err.code = "OUT_OF_RANGE";
    throw err;
  }
  
  const fee = computeDeliveryFee(distanceKm);
  return {
    distance_km: Number(distanceKm.toFixed(2)),
    duration_min: d.durationS ? Math.max(1, Math.round(d.durationS / 60)) : null,
    fare: fee.fare,
    currency: fee.currency,
    breakdown: fee.breakdown,
    distance_source: d.road ? "road" : "estimated",
    provider: d.source,
  };
}

module.exports = { calculateFare, computeDeliveryFee };