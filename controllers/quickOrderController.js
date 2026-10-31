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

// controllers/quickOrderController.js
const QuickOrder = require("../models/QuickOrder");
const UnmatchedProduct = require("../models/UnmatchedProduct");
const Order = require("../models/Order");
const User = require("../models/User");
const Product = require("../models/Product");
const Vendor = require("../models/Vendor");
const VendorBranch = require("../models/VendorBranch");           // <- path apne project ke mutabiq
// const { sendNotificationToVendor } = require("../utils/notifications"); // <- jahan createOrder import karta ha wahi path

const { parseOrder, AIParseError } = require("../utils/geminiHelper");
const { matchItem, searchProducts, normalize } = require("../utils/productMatcher");

const DELIVERY_FEE = Number(process.env.DELIVERY_FEE || 200);     // PKR (pehle yahan 2.0 tha - bug)
const TAX_PERCENT = Number(process.env.USER_TAX_PERCENT || 5);    // createOrder wala salesAndServiceTaxForUser
const CATEGORIES = ["food", "mart", "pharmacy", "grocery"];
const round2 = (n) => Number(Number(n).toFixed(2));

class HttpError extends Error {
  constructor(status, message, extra = {}) { super(message); this.status = status; this.extra = extra; }
}

const mapCategoryToEnum = (cat) => {
  const c = (cat || "").toLowerCase();
  if (c.includes("food") || c.includes("restaurant")) return "fast-food";
  if (c.includes("pharmacy") || c.includes("medicine")) return "pharmacy";
  if (c.includes("grocery") || c.includes("mart")) return "grocery";
  if (c.includes("bakery")) return "bakery";
  return "other";
};

// ------------------------------------------------------------------ helpers
function buildSlipItem(parsed, m, isPharmacy) {
  const base = {
    requestedName: parsed.name,
    name: parsed.name,
    brand: parsed.brand || "",
    quantity: parsed.quantity || 1,
    dosage: parsed.dosage || "",
    size: parsed.size || "",
  };
  if (m.status === "MATCHED") {
    const p = m.product;
    return {
      ...base,
      name: p.name,
      productId: p.productId,
      vendorId: p.vendorId,
      image: p.image,
      matchStatus: "MATCHED",
      matchConfidence: m.confidence,
      alternatives: m.alternatives,
      estimatedUnitPrice: p.price,                       // price HAMESHA DB se, AI se kabhi nahi
      totalItemPrice: round2(p.price * base.quantity),
    };
  }
  return {
    ...base,
    productId: null,
    matchStatus: m.status === "UNAVAILABLE" && isPharmacy ? "CUSTOM" : m.status, // pharmacy: prescription item custom reh sakta ha
    matchConfidence: m.confidence,
    alternatives: m.alternatives,
    needsPriceConfirmation: true,
    estimatedUnitPrice: 0,
    totalItemPrice: 0,
  };
}

function recalc(quickOrder) {
  const subtotal = quickOrder.items.reduce((s, i) => s + Number(i.totalItemPrice || 0), 0);
  quickOrder.subtotal = round2(subtotal);
  quickOrder.grandTotal = round2(subtotal + (quickOrder.deliveryFee || DELIVERY_FEE));
}

// Demand tracking: kaunsa product kitni baar maanga gaya. Order ko block nahi karta.
function logUnmatched(items, userId, category) {
  const ops = items
    .filter((i) => i.matchStatus === "UNAVAILABLE" || i.matchStatus === "SUGGESTED" || i.matchStatus === "CUSTOM")
    .map((i) => ({
      updateOne: {
        filter: { normalizedName: normalize(i.requestedName || i.name), category },
        update: {
          $inc: { requestCount: 1 },
          $set: {
            lastRequestedAt: new Date(),
            reason: i.matchStatus === "SUGGESTED" ? "BRAND_NOT_AVAILABLE" : "NOT_FOUND",
            suggestedInstead: i.alternatives?.[0]?.name || "",
          },
          $addToSet: { users: userId },
          $setOnInsert: { itemName: i.requestedName || i.name, brand: i.brand || "", status: "PENDING" },
        },
        upsert: true,
      },
    }));
  if (ops.length) UnmatchedProduct.bulkWrite(ops, { ordered: false }).catch((e) => console.error("logUnmatched:", e.message));
}

async function findOwnedQuickOrder(id, userId, allowedStatuses = ["PROPOSED", "PRICE_UPDATED"]) {
  const qo = await QuickOrder.findOne({ _id: id, user: userId });
  if (!qo) throw new HttpError(404, "Quick Order not found");
  if (!allowedStatuses.includes(qo.status)) throw new HttpError(400, `Order ab ${qo.status} ha, edit nahi ho sakta`);
  return qo;
}

// ------------------------------------------------------------------ 1) PARSE
exports.createQuickOrder = async (req, res) => {
  try {
    const userId = req.user.id;                          // body se userId kabhi nahi (koi aur ke naam par order ban sakta tha)
    const { textMessage = "" } = req.body;
    const category = CATEGORIES.includes(String(req.body.category).toLowerCase())
      ? String(req.body.category).toLowerCase() : "food";
    const file = req.file;
    const isPharmacy = category === "pharmacy";

    if (!textMessage.trim() && !file) {
      return res.status(400).json({ success: false, message: "Text message ya image dein" });
    }

    // AI: sirf "kya maanga" nikalta ha
    const parsed = await parseOrder({
      category,
      imageBuffer: file ? file.buffer : null,
      mimeType: file ? file.mimetype : undefined,
      textPrompt: textMessage,
    });
    if (!parsed.items.length) {
      return res.status(422).json({ success: false, message: "Koi item samajh nahi aya. Dobara wazeh likhein ya saaf photo bhejein." });
    }

    // Hamara code: DB se match
    const matches = await Promise.all(parsed.items.map((it) => matchItem(it, { isPharmacy })));
    const items = parsed.items.map((it, idx) => buildSlipItem(it, matches[idx], isPharmacy));

    const quickOrder = new QuickOrder({
      user: userId,
      category,
      orderType: file ? "IMAGE" : "TEXT",
      rawInputText: textMessage,
      prescriptionImageUrl: "",                          // TODO: image S3/Cloudinary par upload karke URL yahan (memoryStorage mein file disk par nahi hoti)
      parsedBy: parsed.parsedBy,
      items,
      deliveryFee: DELIVERY_FEE,
      customerNotes: parsed.customerNotes || "",
      status: "PROPOSED",
    });
    recalc(quickOrder);
    await quickOrder.save();

    logUnmatched(items, userId, category);

    const summary = {
      matched: items.filter((i) => i.matchStatus === "MATCHED").length,
      needsChoice: items.filter((i) => i.matchStatus === "SUGGESTED").length,
      unavailable: items.filter((i) => i.matchStatus === "UNAVAILABLE").length,
      custom: items.filter((i) => i.matchStatus === "CUSTOM").length,
    };
    return res.status(201).json({ success: true, message: "Order slip ready", summary, data: quickOrder });
  } catch (error) {
    console.error("Quick Order Parse Error:", error);
    const map = {
      AI_NO_CREDITS: [503, "Service abhi available nahi. Baad mein koshish karein."],
      AI_RATE_LIMIT: [503, "Bohat rush ha, thori der baad koshish karein."],
      AI_TIMEOUT: [504, "Request lambi ho gayi, dobara koshish karein."],
      BAD_IMAGE: [400, error.message],
    };
    const [status, message] = map[error.code] || [500, "Order parse nahi ho saka"];
    return res.status(status).json({ success: false, message });   // internal error.message user ko nahi bhejte
  }
};

// ------------------------------------------------------------------ 2) ITEM ACTIONS (alternative chunna / hataana)
exports.updateQuickOrderItem = async (req, res) => {
  try {
    const { quickOrderId, itemId, action, productId } = req.body;
    const qo = await findOwnedQuickOrder(quickOrderId, req.user.id);
    const item = qo.items.id(itemId);
    if (!item) throw new HttpError(404, "Item nahi mila");

    if (action === "select") {
      const p = await Product.findOne({ _id: productId, isActive: true }).select("name price image vendorId").lean();
      if (!p) throw new HttpError(404, "Product available nahi");
      Object.assign(item, {
        name: p.name, productId: p._id, vendorId: p.vendorId || null, image: p.image || "",
        matchStatus: "MATCHED", matchConfidence: 1, alternatives: [], needsPriceConfirmation: false,
        estimatedUnitPrice: p.price, totalItemPrice: round2(p.price * item.quantity),
      });
    } else if (action === "remove") {
      item.deleteOne();
    } else if (action === "keepCustom" && qo.category === "pharmacy") {
      Object.assign(item, { matchStatus: "CUSTOM", alternatives: [] });     // pharmacy: apni hi dawai chahiye
    } else {
      throw new HttpError(400, "Invalid action");
    }
    recalc(qo);
    await qo.save();
    return res.json({ success: true, data: qo });
  } catch (e) { return sendError(res, e, "Item update nahi ho saka"); }
};

// ------------------------------------------------------------------ 3) EDIT (qty / notes / naye items / remove)
exports.editQuickOrder = async (req, res) => {
  try {
    const { quickOrderId, items = [], addItems = [], removeItemIds = [], customerNotes } = req.body;
    const qo = await findOwnedQuickOrder(quickOrderId, req.user.id);
    const isPharmacy = qo.category === "pharmacy";

    if (customerNotes !== undefined) qo.customerNotes = String(customerNotes).slice(0, 300);

    for (const inc of items) {                                    // quantity badalna
      const it = qo.items.id(inc._id || inc.id);
      if (!it || inc.quantity === undefined) continue;
      it.quantity = Math.min(50, Math.max(1, Math.round(Number(inc.quantity)) || 1));
      it.totalItemPrice = round2(it.estimatedUnitPrice * it.quantity);
    }
    for (const id of removeItemIds) qo.items.id(id)?.deleteOne();

    for (const add of addItems.slice(0, 10)) {                    // naye items bhi DB se match honge
      const parsed = { name: String(add.name || "").trim().slice(0, 100), brand: "", quantity: Math.min(50, Math.max(1, Number(add.quantity) || 1)), dosage: add.dosage || "", size: "" };
      if (!parsed.name) continue;
      const m = await matchItem(parsed, { isPharmacy });
      const slipItem = buildSlipItem(parsed, m, isPharmacy);
      qo.items.push(slipItem);
      logUnmatched([slipItem], req.user.id, qo.category);
    }
    recalc(qo);
    await qo.save();
    return res.json({ success: true, message: "Quick Order updated", data: qo });
  } catch (e) { return sendError(res, e, "Edit nahi ho saka"); }
};

// ------------------------------------------------------------------ 4) MANUAL SEARCH
exports.searchCatalog = async (req, res) => {
  try {
    const results = await searchProducts(String(req.query.q || ""), 10);
    return res.json({ success: true, data: results });
  } catch (e) { return sendError(res, e, "Search fail"); }
};

// ------------------------------------------------------------------ 5) CONFIRM -> real Order (createOrder jesa)
exports.confirmQuickOrderToMainOrder = async (req, res) => {
  let lockedId = null;
  let previousStatus = null;
  try {
    const userId = req.user.id;
    const { quickOrderId, addressId, paymentMethod = "cash_on_delivery", instructions = "", promoDiscount = 0 } = req.body;

    // Double-tap / double request se 2 orders na banein: pehle atomic lock
    const locked = await QuickOrder.findOneAndUpdate(
      { _id: quickOrderId, user: userId, status: { $in: ["PROPOSED", "PRICE_UPDATED"] } },
      { $set: { status: "CONFIRMING" } },
      { new: false }
    );
    if (!locked) throw new HttpError(409, "Order mojood nahi ya pehle hi confirm ho chuka ha");
    lockedId = locked._id;
    previousStatus = locked.status;
    const quickOrder = await QuickOrder.findById(lockedId);

    const isPharmacy = quickOrder.category === "pharmacy";
    const defaultOrderFrom = mapCategoryToEnum(quickOrder.category);

    // 1) Jab tak user ne alternative na chuna ho ya item hataya na ho, confirm nahi
    const unresolved = quickOrder.items.filter((i) => i.matchStatus === "SUGGESTED" || i.matchStatus === "UNAVAILABLE");
    if (unresolved.length) {
      throw new HttpError(409, "Kuch items available nahi han. Alternative chunein ya item hata dein.", {
        unresolved: unresolved.map((i) => ({ itemId: i._id, name: i.requestedName || i.name, matchStatus: i.matchStatus })),
      });
    }
    if (!quickOrder.items.length) throw new HttpError(400, "Order mein koi item nahi");

    // 2) Price/availability dobara DB se (slip banne ke baad price badal sakti ha)
    const productIds = quickOrder.items.filter((i) => i.productId).map((i) => i.productId);
    const products = await Product.find({ _id: { $in: productIds }, isActive: true }).lean();
    const productMap = new Map(products.map((p) => [String(p._id), p]));

    const formattedItems = [];
    let subtotal = 0;
    for (const it of quickOrder.items) {
      let price, p = null;
      if (it.matchStatus === "MATCHED") {
        p = productMap.get(String(it.productId));
        if (!p) throw new HttpError(409, `"${it.name}" ab available nahi. Slip edit karein.`);
        price = Number(p.price) || 0;
      } else {
        price = Number(it.estimatedUnitPrice) || 0;       // CUSTOM (pharmacy): price admin/rider confirm karega
      }
      const total = round2(price * it.quantity);
      subtotal += total;
      const mapped = p?.category ? mapCategoryToEnum(p.category) : "other";
      formattedItems.push({
        productId: p ? p._id : null,
        name: it.dosage ? `${it.name} (${it.dosage})` : it.name,
        orderFrom: mapped !== "other" ? mapped : defaultOrderFrom,
        image: p?.image || "",
        category: p?.category || quickOrder.category,
        weight: p?.weight,
        price,
        quantity: it.quantity,
        total,
      });
    }

    // 3) Address (selected addressId ko priority)
    const user = await User.findById(userId);
    if (!user || !user.addresses?.length) throw new HttpError(400, "User ka koi saved address nahi");
    const addr = (addressId && user.addresses.id(addressId)) || user.addresses.find((a) => a.isSave) || user.addresses[0];
    const formattedAddress = {
      phone: addr.phone || user.phone || "",
      address: addr.address || addr.street || "",
      city: addr.city || "Karachi",
      zipCode: addr.zipCode || "",
      country: addr.country || "Pakistan",
      location: { type: "Point", coordinates: addr.location?.coordinates || user.location?.coordinates || [0, 0] },
    };

    // 4) Stops (createOrder wali logic: Vendor + VendorBranch)
    const hasOnlyGroceryItems = formattedItems.every((i) => i.orderFrom === "grocery");
    const vendorIds = [...new Set(products.map((p) => p.vendorId?.toString()).filter(Boolean))];
    const stops = await buildStops(vendorIds, hasOnlyGroceryItems);

    const hasCustom = quickOrder.items.some((i) => i.matchStatus === "CUSTOM");
    if (hasCustom && stops.length === 0) {
      const fb = await Vendor.findOne({ businessType: isPharmacy ? "pharmacy" : defaultOrderFrom });   // field name apne Vendor schema se check karein
      stops.push({
        stopNumber: 1, vendorId: fb?._id || null, branchId: null, logo: fb?.logo || "",
        businessName: fb?.businessName || (isPharmacy ? "OmniGo Partner Pharmacy" : "OmniGo Mart"),
        businessType: isPharmacy ? "pharmacy" : defaultOrderFrom,
        address: fb?.address || "Assigned Regional Merchant", city: fb?.city || "", country: fb?.country || "",
        location: { type: "Point", coordinates: fb?.location?.coordinates || [0, 0] },
        status: "pending",
      });
    }

    // 5) Totals (createOrder jesa)
    const discount = Number(promoDiscount) || 0;
    const tax = (TAX_PERCENT / 100) * subtotal;
    const deliveryFee = quickOrder.deliveryFee || DELIVERY_FEE;
    const totalAmount = round2(subtotal + tax + deliveryFee - discount);

    const note = hasCustom ? " | NOTE: Kuch items ki price confirm honi baqi ha" : "";
    const order = await Order.create({
      orderNumber: "ORD" + Date.now() + Math.floor(Math.random() * 1000),
      userId,
      address: formattedAddress,
      stops,
      items: formattedItems,
      paymentMethod,
      paymentStatus: "pending",
      subtotal: round2(subtotal),
      deliveryFee,
      salesAndServiceTaxForUser: TAX_PERCENT,
      instructions: (instructions || quickOrder.customerNotes || "Quick Order") + note,
      promoDiscount: discount,
      totalAmount,
      status: hasOnlyGroceryItems && !hasCustom ? "ready" : "pending",
      riderId: null,
      isAssigned: false,
      source: "QUICK_ORDER",                              // Order schema mein field add karein (analytics ke liye)
    });

    quickOrder.status = "CONFIRMED";
    quickOrder.orderId = order._id;
    await quickOrder.save();

    // 6) Notifications (fail ho to order cancel nahi hona chahiye)
    try {
      const io = req.app.get("io");
      if (io) io.to("role:admin").emit("adminNewOrder", order);
      /* await Promise.all(vendorIds.map((vId) => sendNotificationToVendor(req.app, {
        vendorId: vId, role: "Vendor", title: "New Order Received!",
        message: `You have received a new order #${order.orderNumber}.`, type: "new_order",
        data: { orderId: order._id, orderNumber: order.orderNumber, totalAmount: order.totalAmount, itemCount: order.items.length, screenToOpen: "VendorOrderDetails" },
        link: `/vendor/orders/${order._id}`,
      }))); */
    } catch (n) { console.error("Notification error:", n.message); }

    return res.status(201).json({ success: true, message: "Order placed successfully", order, orderId: order._id });
  } catch (error) {
    if (lockedId) await QuickOrder.updateOne({ _id: lockedId, status: "CONFIRMING" }, { $set: { status: previousStatus } }).catch(() => {});
    return sendError(res, error, "Order confirm nahi ho saka");
  }
};

async function buildStops(vendorIds, hasOnlyGroceryItems) {
  if (!vendorIds.length) return [];
  const [vendors, branches] = await Promise.all([
    Vendor.find({ _id: { $in: vendorIds } }),
    VendorBranch.find({ vendorId: { $in: vendorIds }, isActive: true }),
  ]);
  return vendors.map((vendor, index) => {
    const b = branches.find((x) => x.vendorId.toString() === vendor._id.toString()) || {};
    return {
      stopNumber: index + 1,
      vendorId: vendor._id,
      branchId: b._id || null,
      logo: vendor.logo || "",
      businessName: vendor.businessName || b.branchName || "Branch Name",
      businessType: vendor.businessType || "fast-food",
      address: b.address || vendor.address || "Vendor Address",
      city: b.city || vendor.city || "Vendor City",
      country: b.country || vendor.country || "Vendor Country",
      location: { type: "Point", coordinates: b.location?.coordinates || vendor.location?.coordinates || [0, 0] },
      status: hasOnlyGroceryItems ? "ready" : "pending",
    };
  });
}

function sendError(res, error, fallbackMessage) {
  if (error instanceof HttpError) return res.status(error.status).json({ success: false, message: error.message, ...error.extra });
  console.error(fallbackMessage + ":", error);
  return res.status(500).json({ success: false, message: fallbackMessage });
}