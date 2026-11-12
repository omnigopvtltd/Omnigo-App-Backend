// utils/productMatcher.js  (v3)
// Search jesa behaviour: user ke text ke liye hamare PRODUCTS (variations ke sath) dhoondta ha.
//  - case-insensitive, typos ("pizaa"), chhota roop ("pza"), joray/alag lafz ("hotpot" = "hot pot")
//  - category ke saare items ("pizza" => har pizza), "small pizza" => pizza + Size:Small preselect
//  - kuch na mile to NOT_FOUND (caller wishlist/waitlist mein save karta ha)
const Product = require("../models/Product");

const REFRESH_MS = 5 * 60 * 1000;
const EMPTY_RETRY_MS = 15 * 1000;
const MATCH_T = 0.65;      // token "mil gaya" ka minimum score
const CAND_MIN = 0.55;     // candidate: aadhe se ZYADA lafz milne chahiyen (2 mein se sirf 1 = junk)
const DEFAULT_LIMIT = 20;

// Available product ki tareef (Product schema: isAvailable + status active/inactive). .env se badal sakte han.
function readFilter() {
  try { if (process.env.PRODUCT_ACTIVE_FILTER) return JSON.parse(process.env.PRODUCT_ACTIVE_FILTER); }
  catch (e) { console.error("[Matcher] PRODUCT_ACTIVE_FILTER valid JSON nahi, default use ho raha ha"); }
  return { isAvailable: { $ne: false }, status: { $ne: "inactive" } };
}
const ACTIVE_FILTER = readFilter();

// Quick-order category -> Product.belongsTo
const CATEGORY_GROUPS = {
  food: ["restaurant", "home-chef", "bakery"],
  grocery: ["grocery", "stationary"],
  mart: ["grocery", "stationary"],
  pharmacy: ["pharmacy"],
};

const SPELLING = {
  briyani: "biryani", biriyani: "biryani", biryaani: "biryani", biriani: "biryani",
  masalah: "masala", masaala: "masala", masalay: "masala", shampu: "shampoo",
};
const STOP = new Set(("ka ki ke ko ek do teen aur and or the of for with pack packet packets pkt pkts pcs pc piece pieces " +
  "x wala wali walay please plz chahiye chahye dena de dein bhejein bhej order dozen").split(" "));
// Size/variation jese lafz: coverage mein ZAROORI nahi (product mein na hon tab bhi theek), match hone par preselect banate han
const MODIFIERS = new Set(("small medium large regular mini family xl xxl half full single double jumbo big extra " +
  "chota bara choti").split(" "));
const SIZE_RE = /^\d+(\.\d+)?(mg|g|kg|ml|l|oz|lb)$/;

function normalize(text = "") {
  return String(text).toLowerCase()
    .replace(/(\d+(?:\.\d+)?)\s*(kilograms?|kilos?|kgs?)\b/g, "$1kg")
    .replace(/(\d+(?:\.\d+)?)\s*(milligrams?|mgs?)\b/g, "$1mg")
    .replace(/(\d+(?:\.\d+)?)\s*(millilit(?:er|re)s?|mls?)\b/g, "$1ml")
    .replace(/(\d+(?:\.\d+)?)\s*(grams?|gms?|g)\b/g, "$1g")
    .replace(/(\d+(?:\.\d+)?)\s*(lit(?:er|re)s?|ltrs?|l)\b/g, "$1l")
    .replace(/[^\p{L}\p{N}\s.]/gu, " ")
    .replace(/\.(?!\d)|(?<!\d)\./g, " ")
    .replace(/\s+/g, " ").trim();
}
function tokenize(text) {
  return normalize(text).split(" ").filter(Boolean).map((w) => SPELLING[w] || w)
    .filter((w) => !STOP.has(w) && !/^\d+(\.\d+)?$/.test(w));
}
const waitlistKey = (text) => [...new Set(tokenize(text))].sort().join(" ");

// ---------------------------------------------------------------- token similarity
function lev(a, b, max) {                       // Damerau-Levenshtein (ulte letters = 1 edit)
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev2 = null;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]; let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (prev2 && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2] + 1);
      cur[j] = v; if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    prev2 = prev; prev = cur;
  }
  return prev[b.length];
}
function isSubseq(s, l) { let i = 0; for (const ch of l) if (ch === s[i]) i++; return i === s.length; }

function tokMatch(q, p, loose = false) {
  if (q === p) return 1;
  if (SIZE_RE.test(q) || SIZE_RE.test(p)) return 0;                 // 500g sirf exact
  const [s, l] = q.length <= p.length ? [q, p] : [p, q];
  if (s.length >= (loose ? 2 : 3) && l.startsWith(s) && (loose || l.length - s.length <= 3 || s.length >= 5)) return 0.9;   // chip/chips, piz/pizza
  const L = s.length;
  if (L >= 4) { const max = L >= 7 ? 2 : 1; if (lev(q, p, max) <= max) return 0.8; }                                         // pizaa, burgr
  if (q.length >= 3 && q.length < p.length && q[0] === p[0] && q.length / p.length >= 0.5 && isSubseq(q, p)) return 0.7;    // pza -> pizza
  return 0;
}

// ---------------------------------------------------------------- catalog
let catalog = [];
let vocab = [];
let loadedAt = 0;
let loading = null;
let lastLoad = { size: 0, sample: [], at: null };

function nameOf(p) {
  const c = p.name ?? p.title ?? p.productName ?? p.itemName;
  if (typeof c === "string") return c;
  if (c && typeof c === "object") return c.en || Object.values(c).find((v) => typeof v === "string") || "";
  return "";
}
function searchTextOf(p) {
  const c = p.name ?? p.title ?? p.productName ?? p.itemName;
  const nm = typeof c === "object" && c ? Object.values(c).filter((v) => typeof v === "string").join(" ") : nameOf(p);
  return `${p.brand || ""} ${nm}`;
}
const firstImage = (p) => (Array.isArray(p.images) ? p.images[0] : p.images) || p.image || "";
// Qeemat: discountPrice (>0) ho to wohi, warna price
const unitPrice = (p) => (Number(p.discountPrice) > 0 ? Number(p.discountPrice) : Number(p.price) || 0);

function entryFromDoc(p) {
  return {
    productId: String(p._id), name: nameOf(p), brand: p.brand || "", category: p.category || "", subcategory: p.subcategory || "",
    price: unitPrice(p), originalPrice: Number(p.price) || 0, discountPrice: Number(p.discountPrice) > 0 ? Number(p.discountPrice) : null,
    image: firstImage(p), weight: p.weight || "", belongsTo: p.belongsTo || "",
    vendorId: p.vendorId ? String(p.vendorId) : null, variations: p.variations || [], addOns: p.addOns || [],
    tags: p.tags || [], type: p.type || "", dosage: p.dosage || "", isRxRequired: !!p.isRxRequired, isVeg: !!p.isVeg, rating: p.rating || {},
  };
}
const withCompounds = (toks) => {
  const out = [...toks];
  for (let i = 0; i < toks.length - 1; i++) if (toks[i].length >= 2 && toks[i + 1].length >= 2) out.push(toks[i] + toks[i + 1]);   // hot+pot => hotpot
  return out;
};

async function refreshCatalog(force = false) {
  if (!force && loadedAt && Date.now() - loadedAt < REFRESH_MS) return;
  if (loading) return loading;
  loading = (async () => {
    const products = await Product.find(ACTIVE_FILTER)
      .select("name title productName itemName brand category subcategory price discountPrice images weight belongsTo vendorId variations addOns tags type dosage isRxRequired isVeg rating").lean();
    catalog = products.map((p) => {
      const nameToks = [...new Set(tokenize(searchTextOf(p)))];
      const tagText = (p.tags || []).map((t) => (typeof t === "string" ? t : t?.tagName || "")).join(" ");
      const catToks = [...new Set(tokenize(`${p.category || ""} ${p.subcategory || ""} ${tagText}`))].filter((t) => !SIZE_RE.test(t));
      const varText = (p.variations || []).map((v) => `${v.title || ""} ${(v.options || []).map((o) => o.name).join(" ")}`).join(" ");
      const varToks = [...new Set(tokenize(varText))];
      return {
        ...entryFromDoc(p),
        tokens: nameToks.filter((t) => !SIZE_RE.test(t)), sizes: nameToks.filter((t) => SIZE_RE.test(t)),
        ctokens: withCompounds(tokenize(`${p.category || ""} ${p.subcategory || ""}`).filter((t) => !SIZE_RE.test(t)))
          .concat(catToks).filter((v, i, a) => a.indexOf(v) === i),
        vtokens: varToks.filter((t) => !SIZE_RE.test(t)),
        key: nameToks.slice().sort().join(" "),
      };
    }).filter((p) => p.name);
    for (const p of catalog) p.mtokens = withCompounds(p.tokens);
    vocab = [...new Set(catalog.flatMap((p) => [...p.mtokens, ...p.ctokens, ...p.vtokens]))];
    lastLoad = { size: catalog.length, sample: catalog.slice(0, 5).map((p) => p.name), at: new Date().toISOString() };
    if (catalog.length === 0) {
      console.error(`[Matcher] CATALOG KHALI ha! Filter=${JSON.stringify(ACTIVE_FILTER)}`);
      loadedAt = Date.now() - REFRESH_MS + EMPTY_RETRY_MS;
    } else { loadedAt = Date.now(); console.log(`[Matcher] ${catalog.length} products load hue`); }
  })();
  try { await loading; } finally { loading = null; }
}

// ---------------------------------------------------------------- scoring
function expand(qTokens, loose) {
  const m = new Map();
  for (const q of qTokens) {
    const hits = new Map();
    for (const v of vocab) { const s = tokMatch(q, v, loose); if (s > 0) hits.set(v, s); }
    m.set(q, hits);
  }
  return m;
}

function scoreProduct(qTokens, exp, prod) {
  let sum = 0, wsum = 0, matched = 0, viaCategory = false, allMatched = true;
  const detail = [], hints = [];
  for (const q of qTokens) {
    const hits = exp.get(q);
    const varHit = () => prod.vtokens.some((t) => (hits.get(t) || 0) >= MATCH_T);
    if (MODIFIERS.has(q)) { if (varHit()) hints.push(q); detail.push({ q, neutral: true }); continue; }
    let s1 = 0, p1 = null; for (const t of prod.mtokens) { const s = hits.get(t) || 0; if (s > s1) { s1 = s; p1 = t; } }
    let s2 = 0, p2 = null; for (const t of prod.ctokens) { const s = (hits.get(t) || 0) * 0.95; if (s > s2) { s2 = s; p2 = t; } }
    let s = s1, src = "name", pp = p1;
    if (s2 > s1) { s = s2; src = "category"; pp = p2; }
    if (s < MATCH_T && varHit()) { hints.push(q); detail.push({ q, neutral: true, src: "variation" }); continue; }   // "cheese" jese variation option
    const w = q.length >= 4 ? 1 : 0.6;
    sum += w * s; wsum += w;
    if (s >= MATCH_T) { matched++; if (src === "category") viaCategory = true; } else allMatched = false;
    detail.push({ q, p: pp, s: Number(s.toFixed(2)), src });
  }
  const coverage = wsum ? sum / wsum : 0;
  const extra = Math.max(0, prod.tokens.length - matched);
  return { coverage, allMatched: allMatched && wsum > 0, viaCategory, detail, hints, score: coverage - Math.min(0.12, extra * 0.03) };
}

async function analyze(item, { groups = null, loose = false } = {}) {
  await refreshCatalog();
  if (catalog.length === 0) { const e = new Error("Product catalog khali ha"); e.code = "CATALOG_EMPTY"; throw e; }
  const text = [item.name, item.size, item.dosage].filter(Boolean).join(" ");
  const all = [...new Set(tokenize(text))];
  const qSizes = all.filter((t) => SIZE_RE.test(t));
  const qTokens = all.filter((t) => !SIZE_RE.test(t));
  const brandTokens = tokenize(item.brand || "");
  let genericTokens = (item.genericName ? tokenize(item.genericName) : qTokens.filter((t) => !brandTokens.includes(t))).filter((t) => !SIZE_RE.test(t));
  if (!genericTokens.length) genericTokens = qTokens;
  const same = genericTokens.length === qTokens.length && genericTokens.every((t, i) => t === qTokens[i]);

  const pool = groups ? catalog.filter((p) => !p.belongsTo || groups.includes(p.belongsTo)) : catalog;
  const exp = expand([...new Set([...qTokens, ...genericTokens, ...brandTokens])], loose);
  const rows = pool.map((p) => {
    const full = qTokens.length ? scoreProduct(qTokens, exp, p) : { coverage: 0, allMatched: false, detail: [], hints: [], score: 0 };
    const gen = same ? full : (genericTokens.length ? scoreProduct(genericTokens, exp, p) : full);
    const brandOk = !brandTokens.length || brandTokens.every((b) => p.mtokens.some((t) => (exp.get(b).get(t) || 0) >= MATCH_T));
    const sizeOk = !qSizes.length || qSizes.every((s) => p.sizes.includes(s));
    return { p, full, gen, brandOk, sizeOk };
  });
  return { all, qTokens, qSizes, brandTokens, genericTokens, rows };
}

function derivePreselect(entry, hints) {                       // "large pizza" => [{title:"Size", option:"Large"}]
  const out = [];
  for (const g of entry.variations || []) {
    let best = null;
    for (const o of g.options || []) {
      for (const h of hints) {
        const s = Math.max(0, ...tokenize(o.name).map((t) => tokMatch(h, t)));
        if (s >= MATCH_T && (!best || s > best.s)) best = { s, title: g.title, option: o.name };
      }
    }
    if (best) out.push({ title: best.title, option: best.option });
  }
  return out;
}

function toCard(r, tier) {
  const p = r.p;
  const matchType = tier === 0 ? (r.gen.viaCategory ? "CATEGORY" : "EXACT") : tier === 1 ? "ALTERNATIVE" : "SIMILAR";
  return {
    productId: p.productId, name: p.name, image: p.image, price: p.price, originalPrice: p.originalPrice, discountPrice: p.discountPrice,
    category: p.category, subcategory: p.subcategory, weight: p.weight, belongsTo: p.belongsTo, vendorId: p.vendorId,
    isVeg: p.isVeg, rating: p.rating, tags: p.tags, type: p.type, dosage: p.dosage, isRxRequired: p.isRxRequired,
    variations: p.variations, addOns: p.addOns, matchType,
    confidence: Number(Math.max(0, Math.min(1, r.gen.score)).toFixed(2)),
    preselect: derivePreselect(p, r.gen.hints),
  };
}

function pick(a, limit) {
  const base = a.genericTokens.length ? a.genericTokens : a.qTokens;
  const content = base.filter((t) => !MODIFIERS.has(t));
  if (!content.length) return { cards: [], hasExact: false };
  const maxLen = Math.max(...content.map((t) => t.length));
  const head = content.filter((t) => t.length === maxLen);                     // sab se lamba lafz zaroor milna chahiye (junk se bachao)
  const cands = a.rows
    .filter((r) => r.gen.coverage >= CAND_MIN && r.gen.detail.some((d) => head.includes(d.q) && d.s >= MATCH_T))
    .map((r) => ({ r, tier: r.gen.allMatched && r.brandOk && r.sizeOk ? 0 : r.gen.allMatched ? 1 : 2 }));
  cands.sort((x, y) => x.tier - y.tier
    || (y.r.gen.score + (y.r.gen.viaCategory ? 0 : 0.05)) - (x.r.gen.score + (x.r.gen.viaCategory ? 0 : 0.05))
    || x.r.p.name.length - y.r.p.name.length);
  return { cards: cands.slice(0, limit).map((c) => toCard(c.r, c.tier)), hasExact: cands.some((c) => c.tier === 0) };
}

async function runSearch(item, { groups, loose, limit }) {
  const a = await analyze(item, { groups, loose });
  let res = pick(a, limit);
  if (!res.hasExact && a.all.length >= 2) {                                    // "hot pot" likha, catalog mein "HotPot"
    for (let i = 0; i < a.all.length - 1; i++) {
      const [x, y] = [a.all[i], a.all[i + 1]];
      if (SIZE_RE.test(x) || SIZE_RE.test(y) || MODIFIERS.has(x) || MODIFIERS.has(y)) continue;
      const merged = [...a.all.slice(0, i), x + y, ...a.all.slice(i + 2)].join(" ");
      const r2 = pick(await analyze({ name: merged, brand: item.brand }, { groups, loose }), limit);
      if (r2.hasExact) { res = r2; break; }
    }
  }
  return res;
}

/**
 * item: { name, size?, dosage?, brand?, genericName? }
 * opts: { category ("food"|"grocery"|"mart"|"pharmacy"), limit, loose, crossFallback }
 * return: { cards[], hasExact, crossCategory }
 */
async function searchCandidates(item, opts = {}) {
  const limit = opts.limit || DEFAULT_LIMIT;
  const groups = opts.category ? CATEGORY_GROUPS[String(opts.category).toLowerCase()] || null : null;
  let res = await runSearch(item, { groups, loose: !!opts.loose, limit });
  let crossCategory = false;
  if (!res.cards.length && groups && opts.crossFallback !== false) {          // is category mein nahi, baqi mein dhoondo
    res = await runSearch(item, { groups: null, loose: !!opts.loose, limit });
    crossCategory = res.cards.length > 0;
  }
  return { ...res, crossCategory };
}

// GET /search (typing/manual search)
async function searchProducts(q, limit = 20, opts = {}) {
  if (tokenize(q).length === 0) return [];
  return (await searchCandidates({ name: q }, { limit, loose: true, ...opts })).cards;
}

async function explainMatch(item, opts = {}) {
  const groups = opts.category ? CATEGORY_GROUPS[opts.category] || null : null;
  const a = await analyze(item, { groups, loose: !!opts.loose });
  const top = a.rows.map((r) => ({ name: r.p.name, coverage: Number(r.gen.coverage.toFixed(2)), score: Number(r.gen.score.toFixed(2)),
    brandOk: r.brandOk, sizeOk: r.sizeOk, tokens: r.gen.detail, hints: r.gen.hints }))
    .sort((x, y) => y.score - x.score).slice(0, 8);
  return { catalog: { ...lastLoad, filter: ACTIVE_FILTER }, query: { tokens: a.qTokens, sizes: a.qSizes, brand: a.brandTokens, generic: a.genericTokens },
    result: pick(a, 5), top };
}

const catalogStats = () => ({ ...lastLoad, filter: ACTIVE_FILTER });

module.exports = { searchCandidates, searchProducts, explainMatch, refreshCatalog, catalogStats, normalize, tokenize, waitlistKey,
  nameOf, entryFromDoc, unitPrice, firstImage, ACTIVE_FILTER, CATEGORY_GROUPS };