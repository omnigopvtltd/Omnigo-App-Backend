const QuickOrder = require("../models/QuickOrder.js");
// const { parseOrderWithGroq } = require("../utils/geminiHelper.js");
const { extractTextFromImage } = require("../utils/ocrHelper.js");
const Order = require("../models/Order");
const Address = require("../models/Address");
const User = require("../models/User.js");
const Product = require("../models/Product");
const Vendor = require("../models/Vendor");

// const QuickOrder = require("../models/QuickOrder.js");
const { parseOrderWithGemmaVision } = require("../utils/geminiHelper.js");

exports.createQuickOrder = async (req, res) => {
  try {
    const { userId, category, textMessage } = req.body;
    const file = req.file; // Express Multer file object

    if (!userId) {
      return res.status(400).json({ success: false, message: "UserId is required" });
    }

    if (!textMessage && !file) {
      return res.status(400).json({
        success: false,
        message: "Provide a text message or upload an image for Quick Order",
      });
    }

    // Direct Image + Text Parsing with Gemma Vision via OpenRouter
    const aiParsedData = await parseOrderWithGemmaVision({
      category: category || "food",
      imageBuffer: file ? file.buffer : null,
      mimeType: file ? file.mimetype : "image/png",
      textPrompt: textMessage || "",
    });

    console.log("---------------- GEMMA PARSED RESULT ----------------");
    console.log(aiParsedData);
    console.log("-----------------------------------------------------");

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
      items: items || aiParsedData,
      subtotal: Number(subtotal.toFixed(2)),
      deliveryFee,
      grandTotal,
      customerNotes: aiParsedData.customerNotes || "",
      status: "PROPOSED",
    });

    await newQuickOrder.save();

    return res.status(201).json({
      success: true,
      message: `${category || "Order"} slip created successfully via Gemma AI`,
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
    const isPharmacyOrder = defaultOrderFrom === "pharmacy";

    let matchedSubtotal = 0;
    const vendorIdsSet = new Set();
    let mappedItems = [];

    // 2. Query Database ONLY IF it is NOT a pharmacy order
    if (isPharmacyOrder) {
      // Pharmacy logic: Skip Product DB search & keep prescription/custom AI items directly
      mappedItems = quickOrder.items.map((item) => {
        const price = item.estimatedUnitPrice || 0;
        const quantity = item.quantity || 1;
        const itemTotal = price * quantity;
        matchedSubtotal += itemTotal;

        return {
          productId: null,
          name: item.dosage ? `${item.name} (${item.dosage})` : item.name,
          orderFrom: "pharmacy",
          image: "",
          category: "pharmacy",
          price,
          quantity,
          total: itemTotal,
        };
      });
    } else {
      // Non-Pharmacy logic: Regular Database Product matching
      mappedItems = await Promise.all(
        quickOrder.items.map(async (item) => {
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
            productId: dbProduct ? dbProduct._id : null,
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
    }

    // 3. Build Stops
    let stops = [];
    const uniqueVendorIds = Array.from(vendorIdsSet);

    if (!isPharmacyOrder && uniqueVendorIds.length > 0) {
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
      // For Pharmacy or Unmatched Items: Find active regional vendor/pharmacy partner
      const fallbackVendor = await Vendor.findOne({
        vendorType: isPharmacyOrder ? "pharmacy" : defaultOrderFrom,
      });

      stops = [
        {
          stopNumber: 1,
          vendorId: fallbackVendor ? fallbackVendor._id : null,
          vendorName: fallbackVendor
            ? fallbackVendor.name
            : isPharmacyOrder
            ? "OmniGo Partner Pharmacy"
            : `OmniGo ${quickOrder.category?.toUpperCase() || "Mart"}`,
          vendorType: isPharmacyOrder ? "pharmacy" : defaultOrderFrom,
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
      message: isPharmacyOrder 
        ? "Pharmacy prescription order placed successfully" 
        : "Order placed successfully with database product matching",
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

// =====================================================
// EDIT QUICK ORDER (BEFORE CONFIRMATION)
// =====================================================
exports.editQuickOrder = async (req, res) => {
  try {
    const { quickOrderId, items, customerNotes, category } = req.body;

    if (!quickOrderId) {
      return res.status(400).json({
        success: false,
        message: "Quick Order ID is required",
      });
    }

    const quickOrder = await QuickOrder.findById(quickOrderId);

    if (!quickOrder) {
      return res.status(404).json({
        success: false,
        message: "Quick Order not found",
      });
    }

    // Checking if order is already confirmed
    if (quickOrder.status === "CONFIRMED") {
      return res.status(400).json({
        success: false,
        message: "Cannot edit an already confirmed quick order",
      });
    }

    // Update Category if provided
    if (category) {
      quickOrder.category = category.toLowerCase();
    }

    // Update Customer Notes if provided
    if (customerNotes !== undefined) {
      quickOrder.customerNotes = customerNotes;
    }

    // Update or Append Items
    if (items && Array.isArray(items)) {
      // Existing items array copy from document
      const currentItems = [...quickOrder.items];

      items.forEach((incomingItem) => {
        const itemId = incomingItem._id || incomingItem.id;

        // 1. First try matching by ID, if not found then match by item Name (case-insensitive)
        let existingIndex = -1;

        if (itemId) {
          existingIndex = currentItems.findIndex(
            (item) => item._id && item._id.toString() === itemId.toString()
          );
        }

        if (existingIndex === -1 && incomingItem.name) {
          existingIndex = currentItems.findIndex(
            (item) => item.name.trim().toLowerCase() === incomingItem.name.trim().toLowerCase()
          );
        }

        // Price and Quantity Calculations
        const unitPrice =
          incomingItem.estimatedUnitPrice !== undefined
            ? Number(incomingItem.estimatedUnitPrice)
            : existingIndex !== -1
            ? Number(currentItems[existingIndex].estimatedUnitPrice || 0)
            : 0;

        const quantity =
          incomingItem.quantity !== undefined
            ? Number(incomingItem.quantity)
            : existingIndex !== -1
            ? Number(currentItems[existingIndex].quantity || 1)
            : 1;

        const totalItemPrice = Number((quantity * unitPrice).toFixed(2));

        if (existingIndex !== -1) {
          // UPDATE Existing Item
          const existingDoc = currentItems[existingIndex].toObject
            ? currentItems[existingIndex].toObject()
            : currentItems[existingIndex];

          currentItems[existingIndex] = {
            ...existingDoc,
            name: incomingItem.name || existingDoc.name,
            dosage:
              incomingItem.dosage !== undefined
                ? incomingItem.dosage
                : existingDoc.dosage,
            quantity,
            estimatedUnitPrice: unitPrice,
            totalItemPrice,
          };
        } else {
          // ADD New Item
          currentItems.push({
            name: incomingItem.name,
            quantity,
            dosage: incomingItem.dosage || "",
            estimatedUnitPrice: unitPrice,
            totalItemPrice,
          });
        }
      });

      // Recalculate Subtotal & Grand Total
      let subtotal = 0;
      currentItems.forEach((item) => {
        subtotal += Number(item.totalItemPrice || 0);
      });

      quickOrder.items = currentItems;
      quickOrder.subtotal = Number(subtotal.toFixed(2));
      quickOrder.grandTotal = Number(
        (subtotal + (quickOrder.deliveryFee || 2.0)).toFixed(2)
      );
    }

    await quickOrder.save();

    return res.status(200).json({
      success: true,
      message: "Quick Order updated successfully",
      data: quickOrder,
    });
  } catch (error) {
    console.error("Edit Quick Order Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to edit quick order",
      error: error.message,
    });
  }
};