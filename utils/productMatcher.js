// utils/productMatcher.js
// AI sirf "kya likha ha" nikalta ha. "Hamare pas kya ha" ye faisla YEH file karti ha (pure code, no AI).
const Fuse = require("fuse.js");
const Product = require("../models/Product");

const REFRESH_MS = 5 * 60 * 1000; // cache 5 min baad refresh
const MATCH_SCORE = 0.25;         // Fuse score: 0 = perfect. Isse kam => auto-match
const ALT_SCORE = 0.5;            // Isse kam => "similar product" ke tor par dikhao
const MAX_ALTERNATIVES = 5;

// Sirf SPELLING variants (translation nahi). Apne catalog ke hisaab se barhate rahein.
const SPELLING = {
  briyani: "biryani", biriyani: "biryani", biryaani: "biryani", biriani: "biryani",
  masalah: "masala", masaala: "masala", masalay: "masala",
  shampu: "shampoo", biscuit: "biscuit", biscut: "biscuit", biscat: "biscuit",
};

let fuse = null;
let catalog = [];
let loadedAt = 0;
let loading = null;

function normalize(text = "") {
  return String(text)
    .toLowerCase()
    .replace(/(\d)\s+(mg|gm|g|kg|ml|ltr|l)\b/g, "$1$2") // "500 mg" -> "500mg"
    .replace(/(\d)gm\b/g, "$1g")
    .replace(/(\d)ltr\b/g, "$1l")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => SPELLING[w] || w)
    .join(" ");
}

async function refreshCatalog(force = false) {
  if (!force && fuse && Date.now() - loadedAt < REFRESH_MS) return;
  if (loading) return loading; // parallel requests ek hi DB query share karein
  loading = (async () => {
    const products = await Product.find({ isActive: true })
      .select("name category price image vendorId brand")
      .lean();
    catalog = products.map((p) => ({
      productId: String(p._id),
      name: p.name,
      brand: p.brand || "",
      category: p.category || "",
      price: Number(p.price) || 0,
      image: p.image || "",
      vendorId: p.vendorId ? String(p.vendorId) : null,
      _norm: normalize(`${p.brand || ""} ${p.name}`),
    }));
    fuse = new Fuse(catalog, {
      keys: ["_norm"],
      includeScore: true,
      threshold: ALT_SCORE,
      ignoreLocation: true,
      minMatchCharLength: 2,
    });
    loadedAt = Date.now();
  })();
  try { await loading; } finally { loading = null; }
}

const toPublic = (p, score) => ({
  productId: p.productId,
  name: p.name,
  price: p.price,
  image: p.image,
  vendorId: p.vendorId,
  category: p.category,
  confidence: Number((1 - score).toFixed(2)),
});

/**
 * item: { name, brand?, genericName?, dosage? }
 * return: { status: MATCHED | SUGGESTED | UNAVAILABLE, product?, confidence, alternatives[] }
 */
async function matchItem(item, { isPharmacy = false } = {}) {
  await refreshCatalog();
  const query = normalize(`${item.name} ${isPharmacy ? item.dosage || "" : ""}`);
  const brand = normalize(item.brand || "");
  if (!query) return { status: "UNAVAILABLE", confidence: 0, alternatives: [] };

  const brandOk = (p) => !brand || p._norm.includes(brand);

  // 1) Exact (normalized) match
  const exact = catalog.find((p) => p._norm === query);
  if (exact && brandOk(exact)) {
    return {
      status: "MATCHED",
      product: toPublic(exact, 0),
      confidence: 1,
      alternatives: variants(query, exact.productId),
    };
  }

  // 2) Fuzzy match
  const hits = fuse.search(query, { limit: 10 });
  const best = hits[0];
  if (best && best.score <= MATCH_SCORE && brandOk(best.item)) {
    return {
      status: "MATCHED",
      product: toPublic(best.item, best.score),
      confidence: Number((1 - best.score).toFixed(2)),
      alternatives: variants(query, best.item.productId, hits),
    };
  }

  // 3) Nahi mila (ya brand alag ha, e.g. Shan maanga, National mila) => similar products
  const generic = normalize(item.genericName || stripWord(query, brand));
  const genericHits = generic ? fuse.search(generic, { limit: 10 }) : [];
  const seen = new Set();
  const alternatives = [...genericHits, ...hits]
    .filter((h) => h.score <= ALT_SCORE)
    .sort((a, b) => a.score - b.score)
    .filter((h) => (seen.has(h.item.productId) ? false : seen.add(h.item.productId)))
    .slice(0, MAX_ALTERNATIVES)
    .map((h) => toPublic(h.item, h.score));

  return {
    status: alternatives.length ? "SUGGESTED" : "UNAVAILABLE",
    confidence: alternatives[0]?.confidence || 0,
    alternatives,
  };
}

// Same product ke dosre sizes/variants (e.g. 50g / 100g) - sirf close scores
function variants(query, excludeId, existingHits) {
  const hits = existingHits || fuse.search(query, { limit: 10 });
  return hits
    .filter((h) => h.item.productId !== excludeId && h.score <= 0.35)
    .slice(0, 3)
    .map((h) => toPublic(h.item, h.score));
}

function stripWord(text, word) {
  if (!word) return text;
  return text.split(" ").filter((w) => w !== word).join(" ");
}

// User khud search kare (manual search box)
async function searchProducts(q, limit = 10) {
  await refreshCatalog();
  const n = normalize(q);
  if (n.length < 2) return [];
  return fuse.search(n, { limit }).map((h) => toPublic(h.item, h.score));
}

module.exports = { matchItem, searchProducts, refreshCatalog, normalize };