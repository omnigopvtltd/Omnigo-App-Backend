// services/waitlistNotifier.js
// Jab koi "nahi mila" wala item catalog mein aa jaye (admin ne product add kiya/available kiya, import hua, kuch bhi),
// to jin users ne wo maanga tha unhein EK dafa notification bhejta ha.
// Hooks ki zaroorat nahi: yeh periodically waitlist ko current catalog se milata ha.
const UnmatchedProduct = require("../models/UnmatchedProduct");
const { searchCandidates, refreshCatalog } = require("../utils/productMatcher");
const defaultNotify = require("./userNotifier");

async function runWaitlistScan({ app = null, notifyUser = defaultNotify, limit = 500 } = {}) {
  await refreshCatalog();
  const pending = await UnmatchedProduct.find({ status: "PENDING", "subscribers.notifiedAt": null }).limit(limit).lean();
  let notified = 0;

  for (const w of pending) {
    let res;
    try { res = await searchCandidates({ name: w.itemName, brand: w.brand }, { category: w.category, limit: 3, crossFallback: false }); }
    catch (e) { console.error("[waitlist] search fail:", e.message); continue; }
    const hit = res.cards.find((c) => c.matchType === "EXACT" || c.matchType === "CATEGORY");   // sirf pakka match (similar nahi)
    if (!hit) continue;

    for (const s of w.subscribers || []) {
      if (s.notifiedAt) continue;
      // Pehle "claim" (taake 2 server/2 scan par 2 dafa notification na jaye), phir bhejo
      const claim = await UnmatchedProduct.updateOne(
        { _id: w._id, subscribers: { $elemMatch: { user: s.user, notifiedAt: null } } },
        { $set: { "subscribers.$.notifiedAt": new Date() } }
      );
      if (!claim.modifiedCount) continue;
      try {
        await notifyUser(app, s.user, {
          title: "Good news! 🎉",
          message: `"${w.itemName}" is now available on OmniGo. Order it now!`,
          type: "requested_item_available",
          data: { productId: hit.productId, productName: hit.name, screenToOpen: "ProductDetails" },
        });
        notified++;
      } catch (e) {
        console.error("[waitlist] notify fail, dobara koshish hogi:", e.message);
        await UnmatchedProduct.updateOne({ _id: w._id, "subscribers.user": s.user }, { $set: { "subscribers.$.notifiedAt": null } });
      }
    }
    const left = await UnmatchedProduct.find({ _id: w._id, "subscribers.notifiedAt": null }).limit(1).lean();
    if (!left.length) await UnmatchedProduct.updateOne({ _id: w._id }, { $set: { status: "ADDED", addedProductId: hit.productId } });
  }
  return { checked: pending.length, notified };
}

// server.js mein ek dafa: startWaitlistScanner({ app })
function startWaitlistScanner({ app, notifyUser, intervalMs = 10 * 60 * 1000 } = {}) {
  const run = () => runWaitlistScan({ app, notifyUser }).then((r) => r.notified && console.log("[waitlist] notified:", r.notified)).catch((e) => console.error("[waitlist] scan error:", e.message));
  const first = setTimeout(run, 60 * 1000);
  const timer = setInterval(run, intervalMs);
  first.unref?.(); timer.unref?.();
  return () => { clearTimeout(first); clearInterval(timer); };
}

module.exports = { runWaitlistScan, startWaitlistScanner };