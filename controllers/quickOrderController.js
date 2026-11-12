// const QuickOrder = require("../models/QuickOrder.js");
// // const { parseOrderWithGroq } = require("../utils/geminiHelper.js");
// const { extractTextFromImage } = require("../utils/ocrHelper.js");
// const Order = require("../models/Order");
// const Address = require("../models/Address");
// const User = require("../models/User.js");
// const Product = require("../models/Product");
// const Vendor = require("../models/Vendor");

// // const QuickOrder = require("../models/QuickOrder.js");
// const { parseOrderWithGemmaVision } = require("../utils/geminiHelper.js");

// exports.createQuickOrder = async (req, res) => {
//   try {
//     const { userId, category, textMessage } = req.body;
//     const file = req.file; // Express Multer file object

//     if (!userId) {
//       return res.status(400).json({ success: false, message: "UserId is required" });
//     }

//     if (!textMessage && !file) {
//       return res.status(400).json({
//         success: false,
//         message: "Provide a text message or upload an image for Quick Order",
//       });
//     }

//     // Direct Image + Text Parsing with Gemma Vision via OpenRouter
//     const aiParsedData = await parseOrderWithGemmaVision({
//       category: category || "food",
//       imageBuffer: file ? file.buffer : null,
//       mimeType: file ? file.mimetype : "image/png",
//       textPrompt: textMessage || "",
//     });

//     console.log("---------------- GEMMA PARSED RESULT ----------------");
//     console.log(aiParsedData);
//     console.log("-----------------------------------------------------");

//     // Subtotal Calculation
//     let subtotal = 0;
//     const items = (aiParsedData.items || []).map((item) => {
//       const unitPrice = item.estimatedUnitPrice || 0;
//       const totalItemPrice = Number((item.quantity * unitPrice).toFixed(2));
//       subtotal += totalItemPrice;

//       return {
//         name: item.name,
//         quantity: item.quantity || 1,
//         dosage: item.dosage || "",
//         estimatedUnitPrice: unitPrice,
//         totalItemPrice,
//       };
//     });

//     const deliveryFee = 2.0;
//     const grandTotal = Number((subtotal + deliveryFee).toFixed(2));

//     const newQuickOrder = new QuickOrder({
//       user: userId,
//       category: category || "food",
//       orderType: file ? "IMAGE" : "TEXT",
//       rawInputText: textMessage || "",
//       prescriptionImageUrl: file ? `/uploads/${file.filename || file.originalname}` : "",
//       items: items || aiParsedData,
//       subtotal: Number(subtotal.toFixed(2)),
//       deliveryFee,
//       grandTotal,
//       customerNotes: aiParsedData.customerNotes || "",
//       status: "PROPOSED",
//     });

//     await newQuickOrder.save();

//     return res.status(201).json({
//       success: true,
//       message: `${category || "Order"} slip created successfully via Gemma AI`,
//       data: newQuickOrder,
//     });
//   } catch (error) {
//     console.error("Quick Order Parse Error:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Failed to parse order",
//       error: error.message,
//     });
//   }
// };

// const mapCategoryToEnum = (cat) => {
//   const categoryStr = (cat || "").toLowerCase();
//   if (categoryStr.includes("food") || categoryStr.includes("restaurant")) return "fast-food";
//   if (categoryStr.includes("pharmacy") || categoryStr.includes("medicine")) return "pharmacy";
//   if (categoryStr.includes("grocery") || categoryStr.includes("mart")) return "grocery";
//   if (categoryStr.includes("bakery")) return "bakery";
//   return "other";
// };

// exports.confirmQuickOrderToMainOrder = async (req, res) => {
//   try {
//     const { quickOrderId, addressId, paymentMethod, instructions } = req.body;

//     const quickOrder = await QuickOrder.findById(quickOrderId);
//     if (!quickOrder) {
//       return res.status(404).json({ success: false, message: "Quick Order not found" });
//     }

//     // 1. User & Address Resolution
//     const user = await User.findById(quickOrder.user);
//     if (!user || !user.addresses || user.addresses.length === 0) {
//       return res.status(400).json({
//         success: false,
//         message: "User has no saved addresses.",
//       });
//     }

//     let selectedAddress = addressId ? user.addresses.id(addressId) : null;
//     if (!selectedAddress) {
//       selectedAddress = user.addresses.find((addr) => addr.isSave) || user.addresses[0];
//     }

//     const defaultOrderFrom = mapCategoryToEnum(quickOrder.category);
//     const isPharmacyOrder = defaultOrderFrom === "pharmacy";

//     let matchedSubtotal = 0;
//     const vendorIdsSet = new Set();
//     let mappedItems = [];

//     // 2. Query Database ONLY IF it is NOT a pharmacy order
//     if (isPharmacyOrder) {
//       // Pharmacy logic: Skip Product DB search & keep prescription/custom AI items directly
//       mappedItems = quickOrder.items.map((item) => {
//         const price = item.estimatedUnitPrice || 0;
//         const quantity = item.quantity || 1;
//         const itemTotal = price * quantity;
//         matchedSubtotal += itemTotal;

//         return {
//           productId: null,
//           name: item.dosage ? `${item.name} (${item.dosage})` : item.name,
//           orderFrom: "pharmacy",
//           image: "",
//           category: "pharmacy",
//           price,
//           quantity,
//           total: itemTotal,
//         };
//       });
//     } else {
//       // Non-Pharmacy logic: Regular Database Product matching
//       mappedItems = await Promise.all(
//         quickOrder.items.map(async (item) => {
//           const dbProduct = await Product.findOne({
//             name: { $regex: new RegExp(item.name.trim(), "i") },
//           }).populate("vendorId");

//           const price = dbProduct ? dbProduct.price : item.estimatedUnitPrice || 0;
//           const quantity = item.quantity || 1;
//           const itemTotal = price * quantity;
//           matchedSubtotal += itemTotal;

//           if (dbProduct && dbProduct.vendorId) {
//             vendorIdsSet.add(dbProduct.vendorId._id.toString());
//           }

//           return {
//             productId: dbProduct ? dbProduct._id : null,
//             name: dbProduct ? dbProduct.name : item.name,
//             orderFrom: dbProduct?.category ? mapCategoryToEnum(dbProduct.category) : defaultOrderFrom,
//             image: dbProduct?.image || "",
//             category: dbProduct?.category || quickOrder.category || "custom",
//             price,
//             quantity,
//             total: itemTotal,
//           };
//         })
//       );
//     }

//     // 3. Build Stops
//     let stops = [];
//     const uniqueVendorIds = Array.from(vendorIdsSet);

//     if (!isPharmacyOrder && uniqueVendorIds.length > 0) {
//       const realVendors = await Vendor.find({ _id: { $in: uniqueVendorIds } });

//       stops = realVendors.map((vendor, index) => ({
//         stopNumber: index + 1,
//         vendorId: vendor._id,
//         vendorName: vendor.name || vendor.storeName || "Partner Vendor",
//         vendorType: mapCategoryToEnum(vendor.vendorType || quickOrder.category),
//         address: vendor.address || "Vendor Address",
//         location: {
//           type: "Point",
//           coordinates: vendor.location?.coordinates || [0, 0],
//         },
//         status: "assigned",
//       }));
//     } else {
//       // For Pharmacy or Unmatched Items: Find active regional vendor/pharmacy partner
//       const fallbackVendor = await Vendor.findOne({
//         vendorType: isPharmacyOrder ? "pharmacy" : defaultOrderFrom,
//       });

//       stops = [
//         {
//           stopNumber: 1,
//           vendorId: fallbackVendor ? fallbackVendor._id : null,
//           vendorName: fallbackVendor
//             ? fallbackVendor.name
//             : isPharmacyOrder
//             ? "OmniGo Partner Pharmacy"
//             : `OmniGo ${quickOrder.category?.toUpperCase() || "Mart"}`,
//           vendorType: isPharmacyOrder ? "pharmacy" : defaultOrderFrom,
//           address: fallbackVendor ? fallbackVendor.address : "Assigned Regional Merchant",
//           location: {
//             type: "Point",
//             coordinates: fallbackVendor?.location?.coordinates || [0, 0],
//           },
//           status: "assigned",
//         },
//       ];
//     }

//     // 4. Create Main Order Document
//     const finalSubtotal = matchedSubtotal > 0 ? matchedSubtotal : quickOrder.subtotal;
//     const deliveryFee = quickOrder.deliveryFee || 200;

//     const newMainOrder = new Order({
//       userId: quickOrder.user,
//       address: {
//         phone: selectedAddress.phone || user.phone || "",
//         address: selectedAddress.address || selectedAddress.street || "",
//         city: selectedAddress.city || "Chakwal",
//         zipCode: selectedAddress.zipCode || "",
//         country: selectedAddress.country || "Pakistan",
//         location: {
//           type: "Point",
//           coordinates: selectedAddress.location?.coordinates || user.location?.coordinates || [0, 0],
//         },
//       },
//       instructions: instructions || quickOrder.customerNotes || "Quick AI Order",
//       stops,
//       items: mappedItems,
//       paymentMethod: paymentMethod || "cash_on_delivery",
//       paymentStatus: "pending",
//       subtotal: finalSubtotal,
//       deliveryFee,
//       tax: 0,
//       totalAmount: finalSubtotal + deliveryFee,
//       status: "pending",
//     });

//     await newMainOrder.save();

//     quickOrder.status = "CONFIRMED";
//     await quickOrder.save();

//     return res.status(201).json({
//       success: true,
//       message: isPharmacyOrder
//         ? "Pharmacy prescription order placed successfully"
//         : "Order placed successfully with database product matching",
//       order: newMainOrder,
//       orderId: newMainOrder._id,
//     });
//   } catch (error) {
//     console.error("Quick Order Confirmation Error:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Failed to confirm order",
//       error: error.message,
//     });
//   }
// };

// // =====================================================
// // EDIT QUICK ORDER (BEFORE CONFIRMATION)
// // =====================================================
// exports.editQuickOrder = async (req, res) => {
//   try {
//     const { quickOrderId, items, customerNotes, category } = req.body;

//     if (!quickOrderId) {
//       return res.status(400).json({
//         success: false,
//         message: "Quick Order ID is required",
//       });
//     }

//     const quickOrder = await QuickOrder.findById(quickOrderId);

//     if (!quickOrder) {
//       return res.status(404).json({
//         success: false,
//         message: "Quick Order not found",
//       });
//     }

//     // Checking if order is already confirmed
//     if (quickOrder.status === "CONFIRMED") {
//       return res.status(400).json({
//         success: false,
//         message: "Cannot edit an already confirmed quick order",
//       });
//     }

//     // Update Category if provided
//     if (category) {
//       quickOrder.category = category.toLowerCase();
//     }

//     // Update Customer Notes if provided
//     if (customerNotes !== undefined) {
//       quickOrder.customerNotes = customerNotes;
//     }

//     // Update or Append Items
//     if (items && Array.isArray(items)) {
//       // Existing items array copy from document
//       const currentItems = [...quickOrder.items];

//       items.forEach((incomingItem) => {
//         const itemId = incomingItem._id || incomingItem.id;

//         // 1. First try matching by ID, if not found then match by item Name (case-insensitive)
//         let existingIndex = -1;

//         if (itemId) {
//           existingIndex = currentItems.findIndex(
//             (item) => item._id && item._id.toString() === itemId.toString()
//           );
//         }

//         if (existingIndex === -1 && incomingItem.name) {
//           existingIndex = currentItems.findIndex(
//             (item) => item.name.trim().toLowerCase() === incomingItem.name.trim().toLowerCase()
//           );
//         }

//         // Price and Quantity Calculations
//         const unitPrice =
//           incomingItem.estimatedUnitPrice !== undefined
//             ? Number(incomingItem.estimatedUnitPrice)
//             : existingIndex !== -1
//             ? Number(currentItems[existingIndex].estimatedUnitPrice || 0)
//             : 0;

//         const quantity =
//           incomingItem.quantity !== undefined
//             ? Number(incomingItem.quantity)
//             : existingIndex !== -1
//             ? Number(currentItems[existingIndex].quantity || 1)
//             : 1;

//         const totalItemPrice = Number((quantity * unitPrice).toFixed(2));

//         if (existingIndex !== -1) {
//           // UPDATE Existing Item
//           const existingDoc = currentItems[existingIndex].toObject
//             ? currentItems[existingIndex].toObject()
//             : currentItems[existingIndex];

//           currentItems[existingIndex] = {
//             ...existingDoc,
//             name: incomingItem.name || existingDoc.name,
//             dosage:
//               incomingItem.dosage !== undefined
//                 ? incomingItem.dosage
//                 : existingDoc.dosage,
//             quantity,
//             estimatedUnitPrice: unitPrice,
//             totalItemPrice,
//           };
//         } else {
//           // ADD New Item
//           currentItems.push({
//             name: incomingItem.name,
//             quantity,
//             dosage: incomingItem.dosage || "",
//             estimatedUnitPrice: unitPrice,
//             totalItemPrice,
//           });
//         }
//       });

//       // Recalculate Subtotal & Grand Total
//       let subtotal = 0;
//       currentItems.forEach((item) => {
//         subtotal += Number(item.totalItemPrice || 0);
//       });

//       quickOrder.items = currentItems;
//       quickOrder.subtotal = Number(subtotal.toFixed(2));
//       quickOrder.grandTotal = Number(
//         (subtotal + (quickOrder.deliveryFee || 2.0)).toFixed(2)
//       );
//     }

//     await quickOrder.save();

//     return res.status(200).json({
//       success: true,
//       message: "Quick Order updated successfully",
//       data: quickOrder,
//     });
//   } catch (error) {
//     console.error("Edit Quick Order Error:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Failed to edit quick order",
//       error: error.message,
//     });
//   }
// };

// ======================================================================
// controllers/quickOrderController.js  (v3)
//
// FLOW:  parse (products dikhao, slip NAHI)  ->  user chune  ->  [quote]  ->  slip  ->  edit (qty/variation/add/remove)  ->  add-to-cart
const QuickOrder = require("../models/QuickOrder");
const UnmatchedProduct = require("../models/UnmatchedProduct");
const Product = require("../models/Product");
const Cart = require("../models/Cart");                                   // <- path apne project ke mutabiq (createOrder wala Cart model)
const { isValidObjectId } = require("mongoose");

const { parseOrder, localTextParse } = require("../utils/geminiHelper");
const { searchCandidates, searchProducts, explainMatch, catalogStats, waitlistKey, entryFromDoc, firstImage, ACTIVE_FILTER } = require("../utils/productMatcher");
const { priceSelection, PricingError, lineTotal, sumTotals, clampQty, lineKey } = require("../utils/pricing");

const DELIVERY_FEE = Number(process.env.DELIVERY_FEE || 200);               // PKR
const CATEGORIES = ["food", "mart", "pharmacy", "grocery"];
const LOCAL_FIRST = process.env.AI_TEXT_LOCAL_FIRST === "true";             // saade text orders AI ke baghair (0 tokens). Default OFF

class HttpError extends Error {
  constructor(status, message, extra = {}) { super(message); this.status = status; this.extra = extra; }
}
function sendError(res, error, fallback) {
  if (error instanceof HttpError) return res.status(error.status).json({ success: false, message: error.message, ...error.extra });
  if (error instanceof PricingError) return res.status(error.status).json({ success: false, code: error.code, message: error.message });
  console.error(fallback + ":", error);
  return res.status(500).json({ success: false, message: fallback });
}
const mapCategoryToEnum = (cat) => {
  const c = (cat || "").toLowerCase();
  if (c.includes("food") || c.includes("restaurant") || c.includes("home-chef")) return "fast-food";
  if (c.includes("pharmacy") || c.includes("medicine")) return "pharmacy";
  if (c.includes("grocery") || c.includes("mart")) return "grocery";
  if (c.includes("bakery")) return "bakery";
  return "other";
};
const normCategory = (c) => (CATEGORIES.includes(String(c).toLowerCase()) ? String(c).toLowerCase() : "food");

// ---------------------------------------------------------------- helpers
// DB product + user ka intikhab -> slip item. Qeemat SIRF yahan (server) par banti ha.
function buildItem(doc, { quantity, variations, addOns, requestedName }) {
  const priced = priceSelection(doc, { variations, addOns });
  const e = entryFromDoc(doc);
  const qty = clampQty(quantity);
  return {
    requestedName: requestedName || e.name, name: e.name, brand: "", quantity: qty, dosage: e.dosage, size: "",
    productId: doc._id, vendorId: doc.vendorId || null, image: e.image, category: e.category, subcategory: e.subcategory,
    weight: e.weight, belongsTo: e.belongsTo, type: e.type, isRxRequired: e.isRxRequired, isVeg: e.isVeg, tags: e.tags, rating: e.rating,
    variations: e.variations, addOns: e.addOns,
    selectedVariations: priced.selectedVariations, selectedAddOns: priced.selectedAddOns, basePrice: priced.base, variationDefaulted: priced.defaulted,
    matchStatus: "SELECTED", estimatedUnitPrice: priced.unit, totalItemPrice: lineTotal(priced.unit, qty),
  };
}
function recalc(qo) {
  qo.subtotal = sumTotals(qo.items.map((i) => i.totalItemPrice));
  qo.grandTotal = sumTotals([qo.subtotal, qo.deliveryFee || DELIVERY_FEE]);
}
const lineBreakdown = (i) => ({
  itemId: i._id, productId: i.productId, name: i.name, quantity: i.quantity, unitPrice: i.estimatedUnitPrice, basePrice: i.basePrice,
  selectedVariations: i.selectedVariations, selectedAddOns: i.selectedAddOns, variationDefaulted: i.variationDefaulted, lineTotal: i.totalItemPrice,
});

async function loadProducts(ids) {
  const uniq = [...new Set(ids.map(String))];
  const docs = await Product.find({ _id: { $in: uniq }, ...ACTIVE_FILTER }).lean();
  return new Map(docs.map((d) => [String(d._id), d]));
}
function validateSelections(selections) {
  if (!Array.isArray(selections) || !selections.length) throw new HttpError(400, "Select at least one product");
  if (selections.length > 30) throw new HttpError(400, "Too many items (max 30)");
  for (const s of selections) if (!s || !isValidObjectId(s.productId)) throw new HttpError(400, "Invalid productId");
}
// selections -> priced items (same product + same variations/add-ons merge ho jate han)
async function buildItems(selections) {
  validateSelections(selections);
  const map = await loadProducts(selections.map((s) => s.productId));
  const unavailable = selections.filter((s) => !map.has(String(s.productId))).map((s) => ({ productId: String(s.productId) }));
  if (unavailable.length) throw new HttpError(409, "Some selected products are no longer available", { unavailable });
  const items = [];
  for (const s of selections) {
    const item = buildItem(map.get(String(s.productId)), s);
    const key = lineKey(item.productId, item.selectedVariations, item.selectedAddOns);
    const same = items.find((x) => x._key === key);
    if (same) { same.quantity = clampQty(same.quantity + item.quantity); same.totalItemPrice = lineTotal(same.estimatedUnitPrice, same.quantity); }
    else items.push({ ...item, _key: key });
  }
  return items.map(({ _key, ...rest }) => rest);
}

// "Nahi mila" => waitlist (subscribe=true: notification milegi) ya sirf demand count (brand alag mila)
async function saveWaitlist(userId, category, it, { subscribe }) {
  const key = waitlistKey([it.brand, it.name].filter(Boolean).join(" "));
  if (!key) return;
  const filter = { normalizedName: key, category };
  try {
    const set = { lastRequestedAt: new Date(), reason: subscribe ? "NOT_FOUND" : "BRAND_NOT_AVAILABLE" };
    if (subscribe) set.status = "PENDING";
    await UnmatchedProduct.updateOne(filter, {
      $setOnInsert: { itemName: it.name, brand: it.brand || "", ...(subscribe ? {} : { status: "PENDING" }) },
      $inc: { requestCount: 1 }, $set: set,
    }, { upsert: true });
    if (subscribe) {
      await UnmatchedProduct.updateOne({ ...filter, "subscribers.user": { $ne: userId } }, { $push: { subscribers: { user: userId, requestedAt: new Date(), notifiedAt: null } } });
      await UnmatchedProduct.updateOne({ ...filter, subscribers: { $elemMatch: { user: userId, notifiedAt: { $ne: null } } } }, { $set: { "subscribers.$.notifiedAt": null } });
    }
  } catch (e) { console.error("saveWaitlist:", e.message); }   // waitlist fail ho to parse fail nahi hona chahiye
}

async function findOwnedSlip(id, userId) {
  const qo = isValidObjectId(id) ? await QuickOrder.findOne({ _id: id, user: userId }) : null;
  if (!qo) throw new HttpError(404, "Slip not found");
  if (!["PROPOSED", "PRICE_UPDATED"].includes(qo.status)) throw new HttpError(400, `This slip is already ${qo.status}, it can't be edited`);
  return qo;
}

// ================================================================ 1) PARSE  (slip NAHI banta)
// Response: har requested item ke liye products (variations ke sath) YA "available nahi" + wishlist mein save
exports.createQuickOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { textMessage = "" } = req.body;
    const category = normCategory(req.body.category);
    const file = req.file;
    if (!String(textMessage).trim() && !file) return res.status(400).json({ success: false, message: "Send a text message or a photo" });

    let parsed = null, results = null;
    if (LOCAL_FIRST && !file && String(textMessage).trim()) {
      const local = localTextParse(textMessage);
      if (local.items.length) {
        const rs = await Promise.all(local.items.map((it) => searchCandidates(it, { category })));
        if (rs.every((r) => r.cards.length)) { parsed = { ...local, parsedBy: "local-parser" }; results = rs; }
      }
    }
    if (!parsed) {
      parsed = await parseOrder({ category, imageBuffer: file ? file.buffer : null, mimeType: file ? file.mimetype : undefined, textPrompt: String(textMessage).toLowerCase().trim() });
    }
    if (!parsed.items.length) {
      return res.status(422).json({ success: false, message: "We couldn't understand the order. Please type it clearly or send a clearer photo." });
    }
    if (!results) results = await Promise.all(parsed.items.map((it) => searchCandidates(it, { category })));

    const requests = parsed.items.map((it, i) => {
      const r = results[i];
      const found = r.cards.length > 0;
      return {
        requestId: `r${i + 1}`, requestedName: it.name, quantity: it.quantity, size: it.size || "",
        status: found ? "FOUND" : "NOT_AVAILABLE", exactMatch: r.hasExact, crossCategory: r.crossCategory,
        message: found ? null : `Sorry, "${it.name}" is not available yet. We've saved your request and will notify you as soon as it's available, InshaAllah.`,
        products: r.cards,
      };
    });

    // wishlist: nahi mila => subscribe (notification), brand-alag mila => sirf demand
    await Promise.all(parsed.items.map((it, i) => {
      if (!results[i].cards.length) return saveWaitlist(userId, category, it, { subscribe: true });
      if (!results[i].hasExact) return saveWaitlist(userId, category, it, { subscribe: false });
      return null;
    }));

    return res.json({
      success: true,
      data: {
        requests, customerNotes: parsed.customerNotes || "", parsedBy: parsed.parsedBy, category,
        summary: { requested: requests.length, found: requests.filter((r) => r.status === "FOUND").length, notAvailable: requests.filter((r) => r.status === "NOT_AVAILABLE").length },
      },
    });
  } catch (error) {
    console.error("Quick Order Parse Error:", error);
    const map = {
      AI_NO_CREDITS: [503, "Service is not available right now. Please try again later."],
      AI_RATE_LIMIT: [503, "We're a bit busy. Please try again in a moment."],
      AI_TIMEOUT: [504, "That took too long. Please try again."],
      BAD_IMAGE: [400, error.message],
      CATALOG_EMPTY: [503, "Products are not loaded right now. Please try again shortly."],
    };
    const [status, message] = map[error.code] || [500, "We couldn't process your order"];
    return res.status(status).json({ success: false, message });
  }
};

// ================================================================ 2) QUOTE (preview, kuch save nahi)
exports.quote = async (req, res) => {
  try {
    const items = await buildItems(req.body.selections);
    const subtotal = sumTotals(items.map((i) => i.totalItemPrice));
    return res.json({ success: true, data: { lines: items.map(lineBreakdown), subtotal, deliveryFee: DELIVERY_FEE, grandTotal: sumTotals([subtotal, DELIVERY_FEE]) } });
  } catch (e) { return sendError(res, e, "Could not calculate the price"); }
};

// ================================================================ 3) GENERATE SLIP
exports.createSlip = async (req, res) => {
  try {
    const userId = req.user.id;
    const items = await buildItems(req.body.selections);
    const qo = new QuickOrder({
      user: userId, category: normCategory(req.body.category), orderType: req.body.orderType === "IMAGE" ? "IMAGE" : "TEXT",
      rawInputText: String(req.body.rawInputText || "").slice(0, 1000), customerNotes: String(req.body.customerNotes || "").slice(0, 300),
      parsedBy: "selection", items, deliveryFee: DELIVERY_FEE, status: "PROPOSED",
    });
    recalc(qo);
    await qo.save();
    return res.status(201).json({ success: true, message: "Slip generated", data: qo });
  } catch (e) { return sendError(res, e, "Could not generate the slip"); }
};

// ================================================================ 4) EDIT (qty / variation / add-ons / naya item / remove / notes)
// Client SIRF productId, quantity, variations, addOns bhejta ha. Naam/price/vendorId client se kabhi nahi liye jate.
exports.editQuickOrder = async (req, res) => {
  try {
    const { quickOrderId, items = [], addItems = [], removeItemIds = [], customerNotes } = req.body;
    const qo = await findOwnedSlip(quickOrderId, req.user.id);
    if (customerNotes !== undefined) qo.customerNotes = String(customerNotes).slice(0, 300);

    // a) quantity / variation / add-on badalna
    const changes = items.filter((c) => qo.items.id(c._id || c.id));
    const repricing = changes.filter((c) => c.variations !== undefined || c.addOns !== undefined);
    const map = repricing.length ? await loadProducts(repricing.map((c) => qo.items.id(c._id || c.id).productId)) : new Map();
    for (const c of changes) {
      const it = qo.items.id(c._id || c.id);
      if (c.quantity !== undefined) it.quantity = clampQty(c.quantity);
      if (c.variations !== undefined || c.addOns !== undefined) {
        const doc = map.get(String(it.productId));
        if (!doc) throw new HttpError(409, `"${it.name}" is no longer available`);
        const priced = priceSelection(doc, {
          variations: c.variations !== undefined ? c.variations : it.selectedVariations.map((v) => ({ title: v.title, option: v.option })),
          addOns: c.addOns !== undefined ? c.addOns : it.selectedAddOns,
        });
        Object.assign(it, { selectedVariations: priced.selectedVariations, selectedAddOns: priced.selectedAddOns, basePrice: priced.base,
          variationDefaulted: priced.defaulted, estimatedUnitPrice: priced.unit });
      }
      it.totalItemPrice = lineTotal(it.estimatedUnitPrice, it.quantity);
    }
    // b) hatana
    for (const id of removeItemIds) qo.items.id(id)?.deleteOne();

    // c) naye items: search se chuna hua product (productId zaroori). Same product+selection ho to quantity barhti ha
    if (addItems.length) {
      for (const a of addItems) if (!a || !isValidObjectId(a.productId)) throw new HttpError(400, "addItems: a valid productId is required (choose the product from search)");
      const fresh = await buildItems(addItems.slice(0, 10));
      for (const n of fresh) {
        const key = lineKey(n.productId, n.selectedVariations, n.selectedAddOns);
        const same = qo.items.find((x) => lineKey(x.productId, x.selectedVariations, x.selectedAddOns) === key);
        if (same) { same.quantity = clampQty(same.quantity + n.quantity); same.totalItemPrice = lineTotal(same.estimatedUnitPrice, same.quantity); }
        else qo.items.push(n);
      }
    }
    recalc(qo);
    await qo.save();
    return res.json({ success: true, message: "Slip updated", data: qo });
  } catch (e) { return sendError(res, e, "Could not update the slip"); }
};

// ================================================================ 5) SEARCH (typing / "add more items")
exports.searchCatalog = async (req, res) => {
  try {
    const q = String(req.query.q || "").slice(0, 100);
    const limit = Math.min(30, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const category = req.query.category ? normCategory(req.query.category) : undefined;
    return res.json({ success: true, data: await searchProducts(q, limit, { category }) });
  } catch (e) {
    if (e.code === "CATALOG_EMPTY") return res.status(503).json({ success: false, message: "Products are not loaded right now. Please try again shortly." });
    return sendError(res, e, "Search failed");
  }
};

// ================================================================ 6) ADD TO CART  (confirm ki jagah)
// !! Cart item ki shakal: createOrder jo cart items padhta ha (productId, name, orderFrom, image, category, weight, variations, addOns, price, quantity, vendorId).
// !! Agar aap ke Cart schema mein variations/addOns ki shakal alag ho to SIRF toCartItem() badlein.
function toCartItem(it, doc, priced) {
  const mapped = mapCategoryToEnum(doc.belongsTo || doc.category);
  return {
    productId: doc._id, name: doc.name, orderFrom: mapped !== "other" ? mapped : "fast-food", image: firstImage(doc),
    category: doc.category, subcategory: doc.subcategory || "", weight: doc.weight || "",
    variations: priced.selectedVariations, addOns: priced.selectedAddOns,
    price: priced.unit,                                              // ek piece ki qeemat (variation + add-ons shamil)
    quantity: it.quantity, vendorId: doc.vendorId || null, source: "QUICK_ORDER",
  };
}
exports.addToCart = async (req, res) => {
  let lockedId = null, previousStatus = null;
  try {
    const userId = req.user.id;
    const { quickOrderId } = req.body;
    if (!isValidObjectId(quickOrderId)) throw new HttpError(400, "Invalid slip id");

    // Double-tap se cart mein do dafa na jaye: atomic lock
    const locked = await QuickOrder.findOneAndUpdate(
      { _id: quickOrderId, user: userId, status: { $in: ["PROPOSED", "PRICE_UPDATED"] } },
      { $set: { status: "ADDING_TO_CART" } }, { new: false });
    if (!locked) throw new HttpError(409, "This slip was not found or has already been added to the cart");
    lockedId = locked._id; previousStatus = locked.status;
    const qo = await QuickOrder.findById(lockedId);
    if (!qo.items.length) throw new HttpError(400, "The slip has no items");

    // Har item dobara DB se: available? price badli? (slip aur cart ki qeemat hamesha taaza)
    const map = await loadProducts(qo.items.map((i) => i.productId));
    const unavailable = [], lines = [], priceChanges = [];
    for (const it of qo.items) {
      const doc = map.get(String(it.productId));
      if (!doc) { unavailable.push({ itemId: it._id, name: it.name, reason: "Not available anymore" }); continue; }
      let priced;
      try { priced = priceSelection(doc, { variations: it.selectedVariations.map((v) => ({ title: v.title, option: v.option })), addOns: it.selectedAddOns }); }
      catch (e) { unavailable.push({ itemId: it._id, name: it.name, reason: e.message }); continue; }
      if (priced.unit !== it.estimatedUnitPrice) priceChanges.push({ itemId: it._id, name: it.name, oldUnitPrice: it.estimatedUnitPrice, newUnitPrice: priced.unit });
      lines.push({ it, doc, priced });
    }
    if (unavailable.length) throw new HttpError(409, "Some items are no longer available. Please edit the slip.", { unavailable });

    let cart = await Cart.findOne({ userId });
    if (!cart) cart = new Cart({ userId, items: [] });
    for (const { it, doc, priced } of lines) {
      const item = toCartItem(it, doc, priced);
      const key = lineKey(item.productId, item.variations, item.addOns);
      const existing = cart.items.find((c) => lineKey(c.productId, c.variations || [], c.addOns || []) === key);
      if (existing) { existing.quantity = (Number(existing.quantity) || 0) + item.quantity; existing.price = item.price; }
      else cart.items.push(item);
    }
    await cart.save();

    for (const { it, priced } of lines) {                           // slip ko bhi taaza qeemat par
      Object.assign(it, { estimatedUnitPrice: priced.unit, basePrice: priced.base, totalItemPrice: lineTotal(priced.unit, it.quantity) });
    }
    qo.status = "ADDED_TO_CART";
    recalc(qo);
    await qo.save();

    try { const io = req.app.get("io"); if (io) io.to(`user:${userId}`).emit("cart_updated", cart); } catch (n) { console.error("socket:", n.message); }

    return res.json({ success: true, message: "Items added to cart", addedCount: lines.length, priceChanges, slipTotal: qo.subtotal, cart });
  } catch (error) {
    if (lockedId) await QuickOrder.updateOne({ _id: lockedId, status: "ADDING_TO_CART" }, { $set: { status: previousStatus } }).catch(() => {});
    return sendError(res, error, "Could not add the items to the cart");
  }
};

// ================================================================ DEBUG (QUICK_ORDER_DEBUG=true par; warna 404)
exports.debugMatch = async (req, res) => {
  if (process.env.QUICK_ORDER_DEBUG !== "true") return res.status(404).json({ success: false, message: "Not found" });
  try {
    const q = String(req.query.q || "");
    const out = q ? await explainMatch({ name: q, brand: String(req.query.brand || ""), size: String(req.query.size || "") }, { category: req.query.category }) : { catalog: catalogStats() };
    return res.json({ success: true, ...out });
  } catch (e) { return res.status(500).json({ success: false, code: e.code, message: e.message }); }
};