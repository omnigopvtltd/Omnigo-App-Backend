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


const QuickOrder = require('../models/QuickOrder.js');
const { parseOrderWithGroq } = require('../utils/geminiHelper.js');

exports.createQuickOrder = async (req, res) => {
  try {
    const { userId, category, textMessage } = req.body;
    const file = req.file; // Captured via Multer

    if (!userId) {
      return res.status(400).json({ success: false, message: "UserId is required" });
    }

    if (!textMessage && !file) {
      return res.status(400).json({ success: false, message: "Provide a text message or upload an image for Quick Order" });
    }

    // Process using Groq AI
    const aiParsedData = await parseOrderWithGroq({
      category: category || 'food',
      textPrompt: textMessage,
      imageBuffer: file ? file.buffer : null,
      mimeType: file ? file.mimetype : null
    });

    // Subtotal Calculation
    let subtotal = 0;
    const items = (aiParsedData.items || []).map(item => {
      const unitPrice = item.estimatedUnitPrice || 0;
      const totalItemPrice = Number((item.quantity * unitPrice).toFixed(2));
      subtotal += totalItemPrice;

      return {
        name: item.name,
        quantity: item.quantity,
        dosage: item.dosage || '',
        estimatedUnitPrice: unitPrice,
        totalItemPrice
      };
    });

    const deliveryFee = 2.00;
    const grandTotal = Number((subtotal + deliveryFee).toFixed(2));

    const newQuickOrder = new QuickOrder({
      user: userId,
      category: category || 'food',
      orderType: file ? 'IMAGE' : 'TEXT',
      rawInputText: textMessage || "",
      prescriptionImageUrl: file ? `/uploads/${file.filename}` : '',
      items,
      subtotal: Number(subtotal.toFixed(2)),
      deliveryFee,
      grandTotal,
      customerNotes: aiParsedData.customerNotes || '',
      status: 'PROPOSED'
    });

    await newQuickOrder.save();

    return res.status(201).json({
      success: true,
      message: `${category || 'Order'} slip created successfully via Groq AI`,
      data: newQuickOrder
    });

  } catch (error) {
    console.error("Quick Order Parse Error:", error);
    return res.status(500).json({ success: false, message: "Failed to parse order", error: error.message });
  }
};