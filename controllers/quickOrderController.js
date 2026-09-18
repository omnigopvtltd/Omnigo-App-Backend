// const QuickOrder = require('../models/QuickOrder.js');
// const { parseOrderWithGemini } = require('../utils/geminiHelper.js');

// // Create Quick Order (Handles food, Grocery, Pharmacy - Text & Image)
// exports.createQuickOrder = async (req, res) => {
//   try {
//     const { userId, category, textMessage } = req.body;
//     const file = req.file;

//     if (!userId) {
//       return res.status(400).json({ success: false, message: "UserId is required" });
//     }

//     if (!textMessage && !file) {
//       return res.status(400).json({ success: false, message: "Provide text message or prescription/list image" });
//     }

//     // Process using Gemini 2.0 Flash
//     const aiParsedData = await parseOrderWithGemini({
//       category: category || 'food',
//       textPrompt: textMessage,
//       imageBuffer: file ? file.buffer : null,
//       mimeType: file ? file.mimetype : null
//     });

//     // Subtotal Calculation
//     let subtotal = 0;
//     const items = aiParsedData.items.map(item => {
//       const unitPrice = item.estimatedUnitPrice || 0;
//       const totalItemPrice = Number((item.quantity * unitPrice).toFixed(2));
//       subtotal += totalItemPrice;

//       return {
//         name: item.name,
//         quantity: item.quantity,
//         dosage: item.dosage || '',
//         estimatedUnitPrice: unitPrice,
//         totalItemPrice
//       };
//     });

//     const deliveryFee = 2.00;
//     const grandTotal = Number((subtotal + deliveryFee).toFixed(2));

//     const newQuickOrder = new QuickOrder({
//       user: userId,
//       category: category || 'food',
//       orderType: file ? 'IMAGE' : 'TEXT',
//       rawInputText: textMessage || '',
//       items,
//       subtotal: Number(subtotal.toFixed(2)),
//       deliveryFee,
//       grandTotal,
//       customerNotes: aiParsedData.customerNotes || '',
//       status: 'PROPOSED'
//     });

//     await newQuickOrder.save();

//     return res.status(201).json({
//       success: true,
//       message: `${category || 'Order'} slip created successfully`,
//       data: newQuickOrder
//     });

//   } catch (error) {
//     console.error("Quick Order Parse Error:", error);
//     return res.status(500).json({ success: false, message: "Failed to parse order", error: error.message });
//   }
// };

// // 2. Adjust Price (For Rider/Grocery Rate Adjustments)
// exports.adjustPriceByRider = async (req, res) => {
//   try {
//     const { orderId } = req.params;
//     const { updatedItems, reason, adjustedBy } = req.body;

//     const order = await QuickOrder.findById(orderId);
//     if (!order) return res.status(404).json({ message: "Order not found" });

//     let newSubtotal = 0;
//     const itemsWithNewPrices = updatedItems.map(item => {
//       const totalItemPrice = Number((item.quantity * item.estimatedUnitPrice).toFixed(2));
//       newSubtotal += totalItemPrice;
//       return { ...item, totalItemPrice };
//     });

//     const oldTotal = order.grandTotal;
//     const newGrandTotal = Number((newSubtotal + order.deliveryFee).toFixed(2));

//     order.items = itemsWithNewPrices;
//     order.subtotal = Number(newSubtotal.toFixed(2));
//     order.grandTotal = newGrandTotal;
//     order.status = 'PRICE_UPDATED';

//     order.priceAdjustments.push({
//       updatedBy: adjustedBy || 'RIDER',
//       reason: reason || 'Rate adjustment',
//       oldTotal,
//       newTotal: newGrandTotal
//     });

//     await order.save();

//     return res.status(200).json({
//       success: true,
//       message: "Price updated and waiting for customer confirmation",
//       data: order
//     });

//   } catch (error) {
//     return res.status(500).json({ success: false, message: error.message });
//   }
// };

// // 3. Customer Accept/Reject Price
// exports.respondToPriceUpdate = async (req, res) => {
//   try {
//     const { orderId } = req.params;
//     const { accept } = req.body;

//     const order = await QuickOrder.findById(orderId);
//     if (!order) return res.status(404).json({ message: "Order not found" });

//     order.status = accept ? 'CONFIRMED' : 'CANCELLED';
//     await order.save();

//     return res.status(200).json({
//       success: true,
//       message: accept ? "Order confirmed with new price" : "Order cancelled",
//       data: order
//     });

//   } catch (error) {
//     return res.status(500).json({ success: false, message: error.message });
//   }
// };

/////////////////////////////////////////////////////////////////
// const QuickOrder = require("../models/QuickOrder.js");
// const { parseOrderWithGroq } = require("../utils/geminiHelper.js");
// const { extractTextFromImage } = require("../utils/ocrHelper.js");

// exports.createQuickOrder = async (req, res) => {
//   try {
//     const { userId, category, textMessage } = req.body;
//     const file = req.file; // Captured via Multer

//     if (!userId) {
//       return res
//         .status(400)
//         .json({ success: false, message: "UserId is required" });
//     }

//     if (!textMessage && !file) {
//       return res
//         .status(400)
//         .json({
//           success: false,
//           message: "Provide a text message or upload an image for Quick Order",
//         });
//     }

//     let aiParsedData;
//     // Step 1: Extract text using OCR if image is uploaded
//     if (file) {
//       console.log("📸 Image received! Starting Tesseract OCR extraction...");
//       const extractedOcrText = await extractTextFromImage(file.buffer, file.mimetype);

//       console.log("---------------- OCR RESULT ----------------");
//       console.log(extractedOcrText || "⚠️ No text extracted by OCR");
//       console.log("--------------------------------------------");

//       combinedText =
//         `${textMessage}\n[Extracted from Image/Prescription]:\n${extractedOcrText}`.trim();
//         console.log("Combined text for Groq parsing:", combinedText);

//         // Process using Groq AI
//      aiParsedData = await parseOrderWithGroq({
//       category: category || "food",
//       textPrompt: textMessage,
//       // imageBuffer: file ? file.buffer : null,
//       imageBuffer: extractedOcrText ? Buffer.from(extractedOcrText, 'utf8') : null,
//       mimeType: file ? file.mimetype : null,
//     });
    
//     console.log("---------------- GROQ PARSED DATA ----------------");
//     console.log(aiParsedData || "⚠️ No data parsed by Groq AI");
//     console.log("-------------------------------------------------");
//   }
    
//     // Subtotal Calculation
//     let subtotal = 0;
//     const items = (aiParsedData.items || []).map((item) => {
//       const unitPrice = item.estimatedUnitPrice || 0;
//       const totalItemPrice = Number((item.quantity * unitPrice).toFixed(2));
//       subtotal += totalItemPrice;

//       return {
//         name: item.name,
//         quantity: item.quantity,
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
//       prescriptionImageUrl: file ? `/uploads/${file.filename}` : "",
//       items,
//       subtotal: Number(subtotal.toFixed(2)),
//       deliveryFee,
//       grandTotal,
//       customerNotes: aiParsedData.customerNotes || "",
//       status: "PROPOSED",
//     });

//     console.log("New Quick Order object created:", newQuickOrder);
//     await newQuickOrder.save();

//     return res.status(201).json({
//       success: true,
//       message: `${category || "Order"} slip created successfully via Groq AI`,
//       data: newQuickOrder,
//     });
//   } catch (error) {
//     console.error("Quick Order Parse Error:", error);
//     return res
//       .status(500)
//       .json({
//         success: false,
//         message: "Failed to parse order",
//         error: error.message,
//       });
//   }
// };

const QuickOrder = require("../models/QuickOrder.js");
const { parseOrderWithGroq } = require("../utils/geminiHelper.js");
const { extractTextFromImage } = require("../utils/ocrHelper.js");
const Order = require("../models/Order");
const Address = require("../models/Address");
const User = require("../models/User.js");
const Product = require("../models/Product");
const Vendor = require("../models/Vendor");

exports.createQuickOrder = async (req, res) => {
  try {
    const { userId, category, textMessage } = req.body;
    const file = req.file;

    if (!userId) {
      return res.status(400).json({ success: false, message: "UserId is required" });
    }

    if (!textMessage && !file) {
      return res.status(400).json({
        success: false,
        message: "Provide a text message or upload an image for Quick Order",
      });
    }

    let extractedOcrText = "";

    // Step 1: Run OCR if file is uploaded
    if (file) {
      extractedOcrText = await extractTextFromImage(file.buffer, file.mimetype);
      console.log("---------------- OCR RESULT ----------------");
      console.log(extractedOcrText || "⚠️ No text extracted by OCR");
      console.log("--------------------------------------------");
    }

    // Step 2: Combine text message and OCR result
    const combinedPrompt = [
      textMessage ? `User Instruction: ${textMessage}` : "",
      extractedOcrText ? `[Extracted from Image/Prescription]:\n${extractedOcrText}` : ""
    ].filter(Boolean).join("\n\n");

    // Step 3: Pass combined text to Groq AI
    const aiParsedData = await parseOrderWithGroq({
      category: category || "food",
      textPrompt: combinedPrompt,
    });

    console.log("---------------- GROQ PARSED DATA ----------------");
    console.log(aiParsedData);
    console.log("-------------------------------------------------");

    // Subtotal Calculation
    let subtotal = 0;
    const items = (aiParsedData.items || []).map((item) => {
      const unitPrice = item.estimatedUnitPrice || 0;
      const totalItemPrice = Number((item.quantity * unitPrice).toFixed(2));
      subtotal += totalItemPrice;

      return {
        name: item.name,
        quantity: item.quantity || 1,
        dosage: item.dosage || "",
        estimatedUnitPrice: unitPrice,
        totalItemPrice,
      };
    });

    const deliveryFee = 2.0;
    const grandTotal = Number((subtotal + deliveryFee).toFixed(2));

    const newQuickOrder = new QuickOrder({
      user: userId,
      category: category || "food",
      orderType: file ? "IMAGE" : "TEXT",
      rawInputText: textMessage || "",
      prescriptionImageUrl: file ? `/uploads/${file.filename || file.originalname}` : "",
      items,
      subtotal: Number(subtotal.toFixed(2)),
      deliveryFee,
      grandTotal,
      customerNotes: aiParsedData.customerNotes || "",
      status: "PROPOSED",
    });

    await newQuickOrder.save();

    return res.status(201).json({
      success: true,
      message: `${category || "Order"} slip created successfully via Groq AI`,
      data: newQuickOrder,
    });
  } catch (error) {
    console.error("Quick Order Parse Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to parse order",
      error: error.message,
    });
  }
};

// const QuickOrder = require("../models/QuickOrder");
// const Order = require("../models/Order");
// const User = require("../models/User");

// Helper function to convert raw AI categories to Schema Enums safely
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

//     // Resolve User & Address
//     const user = await User.findById(quickOrder.user);
//     if (!user || !user.addresses || user.addresses.length === 0) {
//       return res.status(400).json({
//         success: false,
//         message: "User has no saved addresses. Please add an address first.",
//       });
//     }

//     let selectedAddress = null;
//     if (addressId) {
//       selectedAddress = user.addresses.id(addressId);
//     }
//     if (!selectedAddress) {
//       selectedAddress = user.addresses.find((addr) => addr.isSave) || user.addresses[0];
//     }

//     // 1. Map category to schema valid Enum values
//     const safeOrderFrom = mapCategoryToEnum(quickOrder.category);
//     const safeVendorType = safeOrderFrom === "bakery" ? "other" : safeOrderFrom; // stops schema lacks 'bakery'

//     // 2. Map Quick Order items
//     const mappedItems = quickOrder.items.map((item) => ({
//       orderFrom: safeOrderFrom,
//       productId: null,
//       name: item.dosage ? `${item.name} (${item.dosage})` : item.name,
//       category: quickOrder.category || "custom",
//       price: item.estimatedUnitPrice || 0,
//       quantity: item.quantity || 1,
//       total: item.totalItemPrice || 0,
//     }));

//     // 3. Construct standard Order payload
//     const newMainOrder = new Order({
//       userId: quickOrder.user,
//       address: {
//         phone: selectedAddress.phone || user.phone || "",
//         address: selectedAddress.address || selectedAddress.street || "",
//         city: selectedAddress.city || "Karachi",
//         zipCode: selectedAddress.zipCode || "",
//         country: selectedAddress.country || "Pakistan",
//         location: {
//           type: "Point",
//           coordinates: selectedAddress.location?.coordinates || user.location?.coordinates || [0, 0],
//         },
//       },
//       instructions: instructions || quickOrder.customerNotes || "Quick AI Order",
//       stops: [
//         {
//           stopNumber: 1,
//           vendorName: `OmniGo ${quickOrder.category?.toUpperCase() || "STORE"} Hub`,
//           vendorType: safeVendorType,
//           address: "Nearest Operational Hub",
//           status: "assigned",
//         },
//       ],
//       items: mappedItems,
//       paymentMethod: paymentMethod || "cash_on_delivery",
//       paymentStatus: "pending",
//       subtotal: quickOrder.subtotal,
//       deliveryFee: quickOrder.deliveryFee || 200,
//       tax: 0,
//       totalAmount: quickOrder.grandTotal,
//       status: "pending",
//     });

//     await newMainOrder.save();

//     // 4. Mark QuickOrder as Confirmed
//     quickOrder.status = "CONFIRMED";
//     await quickOrder.save();

//     // 5. Notify Sockets & Vendors
//     const io = req.app.get("io");
//     if (io) {
//       io.to("role:admin").emit("adminNewOrder", newMainOrder);
//     }

//     return res.status(201).json({
//       success: true,
//       message: "Order placed successfully from Quick Order",
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

const mapCategoryToEnum = (cat) => {
  const categoryStr = (cat || "").toLowerCase();
  if (categoryStr.includes("food") || categoryStr.includes("restaurant")) return "fast-food";
  if (categoryStr.includes("pharmacy") || categoryStr.includes("medicine")) return "pharmacy";
  if (categoryStr.includes("grocery") || categoryStr.includes("mart")) return "grocery";
  if (categoryStr.includes("bakery")) return "bakery";
  return "other";
};

exports.confirmQuickOrderToMainOrder = async (req, res) => {
  try {
    const { quickOrderId, addressId, paymentMethod, instructions } = req.body;

    const quickOrder = await QuickOrder.findById(quickOrderId);
    if (!quickOrder) {
      return res.status(404).json({ success: false, message: "Quick Order not found" });
    }

    // 1. User & Address Resolution
    const user = await User.findById(quickOrder.user);
    if (!user || !user.addresses || user.addresses.length === 0) {
      return res.status(400).json({
        success: false,
        message: "User has no saved addresses.",
      });
    }

    let selectedAddress = addressId ? user.addresses.id(addressId) : null;
    if (!selectedAddress) {
      selectedAddress = user.addresses.find((addr) => addr.isSave) || user.addresses[0];
    }

    const defaultOrderFrom = mapCategoryToEnum(quickOrder.category);

    // 2. Query Database to Match AI Items with Real Products & Vendors
    let matchedSubtotal = 0;
    const vendorIdsSet = new Set();

    const mappedItems = await Promise.all(
      quickOrder.items.map(async (item) => {
        // Regex Search in Product DB using AI Item Name
        const dbProduct = await Product.findOne({
          name: { $regex: new RegExp(item.name.trim(), "i") },
        }).populate("vendorId");

        const price = dbProduct ? dbProduct.price : item.estimatedUnitPrice || 0;
        const quantity = item.quantity || 1;
        const itemTotal = price * quantity;
        matchedSubtotal += itemTotal;

        if (dbProduct && dbProduct.vendorId) {
          vendorIdsSet.add(dbProduct.vendorId._id.toString());
        }

        return {
          productId: dbProduct ? dbProduct._id : null, // Real Product ID
          name: dbProduct ? dbProduct.name : item.name,
          orderFrom: dbProduct?.category ? mapCategoryToEnum(dbProduct.category) : defaultOrderFrom,
          image: dbProduct?.image || "",
          category: dbProduct?.category || quickOrder.category || "custom",
          price,
          quantity,
          total: itemTotal,
        };
      })
    );

    // 3. Build Real Stops from Found Vendors
    let stops = [];
    const uniqueVendorIds = Array.from(vendorIdsSet);

    if (uniqueVendorIds.length > 0) {
      const realVendors = await Vendor.find({ _id: { $in: uniqueVendorIds } });
      
      stops = realVendors.map((vendor, index) => ({
        stopNumber: index + 1,
        vendorId: vendor._id,
        vendorName: vendor.name || vendor.storeName || "Partner Vendor",
        vendorType: mapCategoryToEnum(vendor.vendorType || quickOrder.category),
        address: vendor.address || "Vendor Address",
        location: {
          type: "Point",
          coordinates: vendor.location?.coordinates || [0, 0],
        },
        status: "assigned",
      }));
    } else {
      // Fallback: Fetch nearest active vendor for this category if product exact match is missing
      const fallbackVendor = await Vendor.findOne({
        vendorType: defaultOrderFrom,
      });

      stops = [
        {
          stopNumber: 1,
          vendorId: fallbackVendor ? fallbackVendor._id : null,
          vendorName: fallbackVendor ? fallbackVendor.name : `Omnigo ${quickOrder.category?.toUpperCase() || "Mart"}`,
          vendorType: defaultOrderFrom === "grocery" ? "other" : defaultOrderFrom,
          address: fallbackVendor ? fallbackVendor.address : "Assigned Regional Merchant",
          location: {
            type: "Point",
            coordinates: fallbackVendor?.location?.coordinates || [0, 0],
          },
          status: "assigned",
        },
      ];
    }

    // 4. Create Main Order Document
    const finalSubtotal = matchedSubtotal > 0 ? matchedSubtotal : quickOrder.subtotal;
    const deliveryFee = quickOrder.deliveryFee || 200;

    const newMainOrder = new Order({
      userId: quickOrder.user,
      address: {
        phone: selectedAddress.phone || user.phone || "",
        address: selectedAddress.address || selectedAddress.street || "",
        city: selectedAddress.city || "Chakwal",
        zipCode: selectedAddress.zipCode || "",
        country: selectedAddress.country || "Pakistan",
        location: {
          type: "Point",
          coordinates: selectedAddress.location?.coordinates || user.location?.coordinates || [0, 0],
        },
      },
      instructions: instructions || quickOrder.customerNotes || "Quick AI Order",
      stops,
      items: mappedItems,
      paymentMethod: paymentMethod || "cash_on_delivery",
      paymentStatus: "pending",
      subtotal: finalSubtotal,
      deliveryFee,
      tax: 0,
      totalAmount: finalSubtotal + deliveryFee,
      status: "pending",
    });

    await newMainOrder.save();

    quickOrder.status = "CONFIRMED";
    await quickOrder.save();

    return res.status(201).json({
      success: true,
      message: "Order placed successfully with database product matching",
      order: newMainOrder,
      orderId: newMainOrder._id,
    });
  } catch (error) {
    console.error("Quick Order Confirmation Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to confirm order",
      error: error.message,
    });
  }
};