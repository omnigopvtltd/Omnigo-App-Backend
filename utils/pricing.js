// utils/pricing.js
// Qeemat ka SIRF EK jagah hisab (server par). Client se price kabhi nahi lete: sirf "kaunsa product, kaunsi variation/add-on, kitni quantity".
// Sara hisab paisa (integer) mein hota ha taake 0.1 + 0.2 jese float masle na hon.
//
// VARIATION_PRICE_MODE (.env) - Product.variations[].options[].price ka matlab:
//    "replace" (DEFAULT): option.price POORI qeemat ha  -> unit = option.price + add-ons  (product.price ignore)
//         misaal: Pizza price 1200, "Regular 9-inch" option 1000, Extra Cheese 90  => 1000 + 90 = 1090
//    "add"    : option.price EXTRA ha                  -> unit = base + option.price + add-ons
// Agar kisi variation ki price 0 ho to base price (discountPrice ho to wo) hi lagti ha.
const MODE = () => (process.env.VARIATION_PRICE_MODE === "add" ? "add" : "replace");   // DEFAULT: replace

class PricingError extends Error {
  constructor(message, status = 400, code = "PRICING") { super(message); this.status = status; this.code = code; }
}
const toPaisa = (n) => Math.round((Number(n) || 0) * 100);
const fromPaisa = (p) => p / 100;
const eq = (a, b) => String(a ?? "").trim().toLowerCase() === String(b ?? "").trim().toLowerCase();
const basePrice = (p) => (Number(p.discountPrice) > 0 ? Number(p.discountPrice) : Number(p.price) || 0);

/**
 * product: DB doc (lean). sel: { variations: [{title, option}], addOns: ["Cheese", ...] | [{name}] }
 * Return: { unit, base, variationExtras, addOnsTotal, selectedVariations[], selectedAddOns[], defaulted, mode }
 */
function priceSelection(product, sel = {}) {
  const mode = MODE();
  let basePaisa = toPaisa(basePrice(product));
  const chosen = [];
  let defaulted = false;
  const wanted = Array.isArray(sel.variations) ? sel.variations : [];

  // Har variation group ke liye ek option: user ne diya to wohi (validate), warna pehla option (defaulted flag)
  for (const group of product.variations || []) {
    const options = group.options || [];
    if (!options.length) continue;
    const w = wanted.find((x) => eq(x.title, group.title));
    let opt;
    if (w) {
      opt = options.find((o) => eq(o.name, w.option ?? w.name));
      if (!opt) throw new PricingError(`"${w.option ?? w.name}" is not an option for ${group.title} of ${product.name}`, 400, "BAD_VARIATION");
    } else { opt = options[0]; defaulted = true; }
    chosen.push({ title: group.title, option: opt.name, price: Number(opt.price) || 0 });
  }
  for (const w of wanted) {                                          // product mein na hone wali variation = galat request
    if (!(product.variations || []).some((g) => eq(g.title, w.title))) {
      throw new PricingError(`${product.name} has no variation "${w.title}"`, 400, "BAD_VARIATION");
    }
  }

  let variationExtra = 0;
  if (mode === "replace") {
    const firstPriced = chosen.find((c) => toPaisa(c.price) > 0);
    if (firstPriced) basePaisa = toPaisa(firstPriced.price);
    variationExtra = chosen.filter((c) => c !== firstPriced).reduce((s, c) => s + toPaisa(c.price), 0);
  } else {
    variationExtra = chosen.reduce((s, c) => s + toPaisa(c.price), 0);
  }

  const addOns = [];
  let addOnsPaisa = 0;
  for (const a of Array.isArray(sel.addOns) ? sel.addOns : []) {
    const name = typeof a === "string" ? a : a?.name;
    const found = (product.addOns || []).find((x) => eq(x.name, name));
    if (!found) throw new PricingError(`"${name}" is not an add-on of ${product.name}`, 400, "BAD_ADDON");
    if (addOns.some((x) => eq(x.name, found.name))) continue;        // duplicate add-on ek hi baar
    addOns.push({ name: found.name, price: Number(found.price) || 0 });
    addOnsPaisa += toPaisa(found.price);
  }

  const unitPaisa = basePaisa + variationExtra + addOnsPaisa;
  if (!(unitPaisa > 0)) throw new PricingError(`Price is not available for ${product.name}`, 409, "NO_PRICE");
  return {
    unit: fromPaisa(unitPaisa), base: fromPaisa(basePaisa), variationExtras: fromPaisa(variationExtra), addOnsTotal: fromPaisa(addOnsPaisa),
    selectedVariations: chosen, selectedAddOns: addOns, defaulted, mode,
  };
}

const clampQty = (q) => Math.min(50, Math.max(1, Math.round(Number(q)) || 1));
const lineTotal = (unit, qty) => fromPaisa(toPaisa(unit) * clampQty(qty));
const sumTotals = (arr) => fromPaisa(arr.reduce((s, x) => s + toPaisa(x), 0));
const lineKey = (productId, variations = [], addOns = []) =>
  [String(productId), variations.map((v) => `${String(v.title).toLowerCase()}=${String(v.option).toLowerCase()}`).sort().join("|"),
    addOns.map((a) => String(a.name).toLowerCase()).sort().join("|")].join("#");

module.exports = { priceSelection, PricingError, lineTotal, sumTotals, clampQty, lineKey, toPaisa, fromPaisa, basePrice };