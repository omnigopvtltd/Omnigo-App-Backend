const Cart = require("../models/Cart");
const Product = require("../models/Product");
// const { getIO } = require("../socket");

// const Product = require("../models/Product");
const Deal = require("../models/Deal");
const Campaign = require("../models/Campaign");
const mongoose = require("mongoose");


// ================= ADD TO CART =================
// exports.addToCart = async (req, res) => {
//   try {
//     const io = req.app.get("io");
//     const { items } = req.body;

// console.log("ADD TO CART REQUEST BODY:", req.body);

//     // 1. Array validation check
//     if (!Array.isArray(items) || items.length === 0) {
//       return res.status(400).json({
//         success: false,
//         msg: "Please select at least one item",
//       });
//     }

//     // 2. Fetch or create user cart
//     let cart = await Cart.findOne({ userId: req.user.id });
//     if (!cart) {
//       cart = new Cart({
//         userId: req.user.id,
//         items: [],
//       });
//     }

//     console.log("CART BEFORE ADDITION:", cart);

//     // 3. Process each item in the array
//     for (const newItem of items) {
      
//       const itemId = newItem.productId || newItem.itemId || newItem.id;
//       if (!itemId) continue;

//       const qty = Number(newItem.quantity) || 1;

//       const incomingAddOns = Array.isArray(newItem.addOns)
//         ? newItem.addOns
//         : [];
//       const addOnsPrice = incomingAddOns.reduce(
//         (sum, addOn) => sum + (Number(addOn.price) || 0),
//         0,
//       );

//       const incomingVariations = Array.isArray(newItem.variations)
//         ? newItem.variations
//         : [];
//       const variationsPrice = incomingVariations.reduce(
//         (sum, variations) => sum + (Number(variations.price) || 0),
//         0,
//       );

//       // ----------------------------------------------------
//       // AUTO-MATCH ID WITH PRODUCT, DEAL, OR CAMPAIGN
//       // ----------------------------------------------------
//       const [product, deal, campaign] = await Promise.all([
//         Product.findById(itemId).lean(),
//         Deal.findById(itemId).lean(),
//         Campaign.findById(itemId).lean(),
//       ]);

//       const matchedEntity = product || deal || campaign;

//       if (!matchedEntity) continue; // If ID doesn't match anything, skip

//       // Determine entity type
//       let entityType = "product";
//       if (deal) entityType = "deal";
//       else if (campaign) entityType = "campaign";

//       // Check if item already exists in user's cart
//       const existingIndex = cart.items.findIndex((item) => {
//         if (entityType === "product" && item.productId) {
//           return item.productId.toString() === itemId.toString();
//         }
//         if (entityType === "deal" && item.productId) {
//           return item.productId.toString() === itemId.toString();
//         }
//         if (entityType === "campaign" && item.productId) {
//           return item.productId.toString() === itemId.toString();
//         }
//         return false;
//       });

//       // // Price determination
//       // const itemPrice = Number(
//       //   item.discountPrice ||
//       //     matchedEntity.price ||
//       //     newItem.price ||
//       //     0,
//       // );

//       // if (existingIndex > -1) {
//       //   // Update quantity & total if already in cart
//       //   cart.items[existingIndex].quantity += qty;
//       //   cart.items[existingIndex].total =
//       //     cart.items[existingIndex].addOns.reduce(
//       //       (sum, addOn) => sum + (addOn.price || 0),
//       //       0,
//       //     ) +
//       //     cart.items[existingIndex].quantity * cart.items[existingIndex].price;
//       // }
//       if (existingIndex > -1) {
//         console.log("Item already exists in cart. Updating quantity and total.", existingIndex);
//         const existingItem = cart.items[existingIndex];
//         console.log("Item already exists in cart. Updating quantity and total.", existingItem);

//   if (incomingAddOns.length > 0) existingItem.addOns = incomingAddOns;
//   if (newItem.variations) existingItem.variations = newItem.variations;

//   existingItem.quantity += qty;

//   const currentAddOnsPrice = existingItem.addOns.reduce(
//     (sum, addOn) => sum + (Number(addOn.price) || 0),
//     0
//   );
//   const currentVariationsPrice = existingItem.variations.reduce(
//     (sum, variations) => sum + (Number(variations.price) || 0),
//     0
//   );

//   // Exact Total Calculation: (Price + AddOns) * Total Quantity
//   existingItem.total = (existingItem.price) * existingItem.quantity;
// } 
//       else {
//         // Construct new cart item object
//         const cartItem = {
//           orderFrom: newItem.orderFrom || "fast-food",
//           name:
//             matchedEntity.name ||
//             matchedEntity.title ||
//             matchedEntity.dealName ||
//             matchedEntity.campaignName ||
//             newItem.name ||
//             "Item",
//           image:
//             matchedEntity.image ||
//             (matchedEntity.images && matchedEntity.images[0]) ||
//             matchedEntity.campaignBanner ||
//             matchedEntity.dealBanner ||
//             newItem.image ||
//             "",
//           category: matchedEntity.category || newItem.category || entityType,
//           weight: matchedEntity.weight || newItem.weight || "",
//           price: newItem.price || matchedEntity.discountPrice,
//           quantity: qty,
//           variations: newItem.variations || matchedEntity.variations || [],
//           addOns: newItem.addOns || matchedEntity.addOns || [],
//           serving: newItem.serving || matchedEntity.serving || "full",
//           isVeg: newItem.isVeg ?? matchedEntity.isVeg ?? false,
//           total:
//             (newItem.price) *
//             qty,
//         };

//         // Attach specific ID based on match
//         if (entityType === "deal") {
//           cartItem.productId = matchedEntity._id;
//         } else if (entityType === "campaign") {
//           cartItem.productId = matchedEntity._id;
//         } else {
//           cartItem.productId = matchedEntity._id;
//         }

//         cart.items.push(cartItem);
//       }
//     }



//     await cart.save();

//     // 4. Emit socket event
//     if (io) {
//       io.to(`user:${req.user.id}`).emit("cart_updated", cart);
//     }
// console.log("CART AFTER ADDITION:", cart);
//     return res.status(200).json({
//       success: true,
//       msg: "Added to cart successfully",
//       items: cart.length,
//       cart,
//     });
//   } catch (err) {
//     console.error("ADD TO CART ERROR:", err);
//     return res.status(500).json({
//       success: false,
//       msg: "Server Error",
//       error: err.message,
//     });
//   }
// };

exports.addToCart = async (req, res) => {
  try {
    const io = req.app.get("io");
    const { items } = req.body;

    console.log("ADD TO CART REQUEST BODY:", JSON.stringify(req.body, null, 2));

    // 1. Array Validation
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        msg: "Please select at least one item",
      });
    }

    // 2. Fetch or Create Cart
    let cart = await Cart.findOne({ userId: req.user.id });
    if (!cart) {
      cart = new Cart({
        userId: req.user.id,
        items: [],
      });
    }

    // 3. Process Each Incoming Item
    for (const newItem of items) {
      const itemId = newItem.productId || newItem.itemId || newItem.id;
      if (!itemId || !mongoose.Types.ObjectId.isValid(itemId)) continue;

      const qty = Number(newItem.quantity) > 0 ? Number(newItem.quantity) : 1;

      // Parallel Fetch: Product, Deal, or Campaign
      const [product, deal, campaign] = await Promise.all([
        Product.findById(itemId).lean(),
        Deal.findById(itemId).lean(),
        Campaign.findById(itemId).lean(),
      ]);

      const matchedEntity = product || deal || campaign;
      if (!matchedEntity) {
        console.log(`No entity found for ID: ${itemId}`);
        continue;
      }

      // Determine Entity Type
      let entityType = "product";
      let refModel = "Product";
      if (deal) {
        entityType = "deal";
        refModel = "Deal";
      } else if (campaign) {
        entityType = "campaign";
        refModel = "Campaign";
      }

      // Safe Extraction of Price Across Entity Types
      const offer = matchedEntity.offerDetails || {};
      const unitPrice = Number(
        newItem.price ??
        matchedEntity.discountPrice ??
        offer.dealPrice ??
        matchedEntity.price ??
        offer.originalPrice ??
        0
      );

      const originalUnitPrice = Number(
        matchedEntity.price ??
        offer.originalPrice ??
        unitPrice
      );

      // Safe Extraction of Name & Image
      const itemName =
        newItem.name ||
        matchedEntity.name ||
        matchedEntity.title ||
        matchedEntity.dealName ||
        matchedEntity.campaignName ||
        "Item";

      const itemImage =
        newItem.image ||
        matchedEntity.image ||
        (Array.isArray(matchedEntity.images) ? matchedEntity.images[0] : null) ||
        matchedEntity.dealBanner ||
        matchedEntity.campaignBanner ||
        "";

      const vendorId = matchedEntity.vendorId?._id || matchedEntity.vendorId || null;

      // Variations & Add-Ons Arrays
      const incomingAddOns = Array.isArray(newItem.addOns) ? newItem.addOns : [];
      const incomingVariations = Array.isArray(newItem.variations) ? newItem.variations : [];

      // Calculate Variations Sum & Add-Ons Sum
      const addOnsUnitSum = incomingAddOns.reduce(
        (sum, a) => sum + (Number(a.price) || 0),
        0
      );

      const variationsUnitSum = incomingVariations.reduce((sum, v) => {
        if (v.options && Array.isArray(v.options)) {
          return sum + v.options.reduce((oSum, o) => oSum + (Number(o.price) || 0), 0);
        }
        return sum + (Number(v.price) || 0);
      }, 0);

      // Single Unit Base Price = Item Base + Variation Extra Cost
      const singleItemPriceWithVariations = variationsUnitSum === 0 ? unitPrice : variationsUnitSum;

      // Check if exact same item exists in user cart
      const existingIndex = cart.items.findIndex((item) => {
        return (
          item.productId &&
          item.productId.toString() === itemId.toString() &&
          item.itemType === entityType
        );
      });

      if (existingIndex > -1) {
        // UPDATE EXISTING CART ITEM
        const existingItem = cart.items[existingIndex];

        if (incomingAddOns.length > 0) existingItem.addOns = incomingAddOns;
        if (incomingVariations.length > 0) existingItem.variations = incomingVariations;

        existingItem.quantity += qty;

        const currentAddOnsSum = existingItem.addOns.reduce(
          (sum, a) => sum + (Number(a.price) || 0),
          0
        );

        const currentVarSum = existingItem.variations.reduce((sum, v) => {
          if (v.options && Array.isArray(v.options)) {
            return sum + v.options.reduce((oSum, o) => oSum + (Number(o.price) || 0), 0);
          }
          return sum + (Number(v.price) || 0);
        }, 0);

        // Final Line Total = (Item Unit Price + Variations + AddOns) * Total Quantity
        existingItem.total =
          (Number(currentVarSum || existingItem.price || unitPrice) + currentAddOnsSum) *
          existingItem.quantity;
      } else {
        // PUSH NEW CART ITEM
        const lineItemTotal = (singleItemPriceWithVariations + addOnsUnitSum) * qty;

        const cartItem = {
          orderFrom: newItem.orderFrom || matchedEntity.category || "fast-food",
          itemType: entityType,
          productId: matchedEntity._id,
          itemTypeRef: refModel,
          vendorId: vendorId,
          name: itemName,
          image: itemImage,
          category: matchedEntity.category || newItem.category || entityType,
          weight: matchedEntity.weight || newItem.weight || "",
          price: unitPrice,
          originalPrice: originalUnitPrice,
          quantity: qty,
          variations: incomingVariations,
          addOns: incomingAddOns,
          serving: newItem.serving || "full",
          isVeg: newItem.isVeg ?? matchedEntity.isVeg ?? false,
          total: lineItemTotal,
        };

        cart.items.push(cartItem);
      }
    }

    await cart.save();

    // 4. Socket Notification
    if (io) {
      io.to(`user:${req.user.id}`).emit("cart_updated", cart);
    }

    return res.status(200).json({
      success: true,
      msg: "Added to cart successfully",
      itemsCount: cart.items.length,
      cart,
    });
  } catch (err) {
    console.error("ADD TO CART ERROR:", err);
    return res.status(500).json({
      success: false,
      msg: "Server Error",
      error: err.message,
    });
  }
};

// ================= GET CART =================
exports.getCart = async (req, res) => {
  try {
    let cart = await Cart.findOne({ userId: req.user.id }).lean();

    if (!cart) {
      return res.status(200).json({
        success: true,
        cart: { items: [], grandTotal: 0 },
      });
    }

    // Calculate overall Cart Grand Total dynamically for frontend ease
    const grandTotal = cart.items.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
const updatedCart = { ...cart, grandTotal };
    return res.status(200).json({
      success: true,
      cart: {
        ...cart,
        grandTotal,
      },
    });
  } catch (err) {
    console.error("GET CART ERROR:", err);
    return res.status(500).json({
      success: false,
      msg: "Server Error",
      error: err.message,
    });
  }
};

// ================= UPDATE CART =================
exports.updateCart = async (req, res) => {
  try {
    const io = req.app.get("io");
    const { productId, quantity } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        msg: "ProductId required",
      });
    }

    const cart = await Cart.findOne({
      userId: req.user.id,
    });

    if (!cart) {
      return res.status(404).json({
        success: false,
        msg: "Cart not found",
      });
    }

    const item = cart.items.find(
      (item) => item.productId && item.productId.toString() === productId.toString()
    );

    if (!item) {
      return res.status(404).json({
        success: false,
        msg: "Item not found in cart",
      });
    }

    const newQty = Number(quantity);

    if (newQty <= 0) {
      // Quantity 0 ya us se kam hone par item remove kar dein
      cart.items = cart.items.filter(
        (i) => i.productId && i.productId.toString() !== productId.toString()
      );
    } else {
      // 1. Quantity update karein
      item.quantity = newQty;

      // 2. Safe AddOns & Variations price calculation
      const addOnsPrice = (item.addOns || []).reduce(
        (sum, addOn) => sum + (Number(addOn.price) || 0),
        0
      );

      const variationsPrice = (item.variations || []).reduce(
        (sum, variation) => sum + (Number(variation.price) || 0),
        0
      );

      // 3. Recalculate Item Total: (Base Price + AddOns + Variations) * Quantity
      item.total = (Number(item.price || 0) + addOnsPrice + variationsPrice) * newQty;
    }

    await cart.save();

    // Socket Event Emit (Ensured room format consistency `user:${req.user.id}`)
    if (io) {
      io.to(`user:${req.user.id}`).emit("cart_updated", cart);
    }

    return res.status(200).json({
      success: true,
      msg: "Cart updated successfully",
      cart,
    });
  } catch (err) {
    console.error("UPDATE CART ERROR:", err);

    return res.status(500).json({
      success: false,
      msg: "Server Error",
      error: err.message,
    });
  }
};

// ================= REMOVE ITEM =================
exports.removeItem = async (req, res) => {
  try {
    const io = req.app.get("io");
    const removeId = req.params.id; // URL parameter se aane wali ID

    if (!removeId) {
      return res.status(400).json({
        success: false,
        msg: "Item ID is required",
      });
    }

    const cart = await Cart.findOne({
      userId: req.user.id,
    });

    if (!cart) {
      return res.status(404).json({
        success: false,
        msg: "Cart not found",
      });
    }

    // Filter array: ObjectId ko string me convert karke compare karein
    cart.items = cart.items.filter((item) => {
      const pId = item.productId ? item.productId.toString() : null;
      const dId = item.dealId ? item.dealId.toString() : null;
      const cId = item.campaignId ? item.campaignId.toString() : null;
      const subItemId = item._id ? item._id.toString() : null;

      // Agar ID productId, dealId, campaignId, ya item._id me se kisi se match ho jaye toh usko array se nikaal do
      const isMatch =
        pId === removeId ||
        dId === removeId ||
        cId === removeId ||
        subItemId === removeId;

      return !isMatch; // Jis par match hoga, wo filter out (remove) ho jaye ga
    });

    await cart.save();

    // Socket Room Naming Check: user: ID format match karein
    if (io) {
      io.to(`user:${req.user.id}`).emit("cart_updated", cart);
    }

    return res.status(200).json({
      success: true,
      msg: "Item removed successfully",
      cart,
    });
  } catch (err) {
    console.error("REMOVE ITEM ERROR:", err);

    return res.status(500).json({
      success: false,
      msg: "Server Error",
      error: err.message,
    });
  }
};
// ================= CLEAR CART =================
exports.clearCart = async (req, res) => {
  try {
    const io = req.app.get("io");

    const cart = await Cart.findOne({
      userId: req.user.id,
    });

    if (!cart) {
      return res.status(404).json({
        success: false,
        msg: "Cart not found",
      });
    }

    cart.items = [];

    await cart.save();

    io.to(`user:${req.user.id}`).emit("cart_updated", cart);

    res.status(200).json({
      success: true,
      msg: "Cart cleared",
      cart,
    });
  } catch (err) {
    console.log("CLEAR CART ERROR:", err);

    res.status(500).json({
      success: false,
      msg: "Server Error",
    });
  }
};

// ================= BULK ADD TO CART =================
exports.bulkAddToCart = async (req, res) => {
  try {
    const io = req.app.get("io");

    const { products } = req.body;

    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({
        success: false,
        msg: "Products array is required",
      });
    }

    let cart = await Cart.findOne({
      userId: req.user.id,
    });

    if (!cart) {
      cart = new Cart({
        userId: req.user.id,
        items: [],
      });
    }

    for (const item of products) {
      const product = await Product.findById(item.productId);

      if (!product) continue;

      const quantity = Number(item.quantity) || 1;

      const existingIndex = cart.items.findIndex(
        (cartItem) => cartItem.productId.toString() === product._id.toString(),
      );

      if (existingIndex > -1) {
        cart.items[existingIndex].quantity += quantity;
      } else {
        cart.items.push({
          productId: product._id,
          name: product.name,
          weight: product.weight,
          price: product.price,
          quantity,
          category: product.category,
          image: product.image || product.images[0],
          variations: product.variations,
          addOns: product.addOns,
          serving: product.serving,
          isVeg: product.isVeg,
          description: product.description,
        });
      }
    }

    await cart.save();

    io.to(`user_${req.user.id}`).emit("cart_updated", cart);

    return res.status(200).json({
      success: true,
      msg: "Products added to cart",
      cart,
    });
  } catch (err) {
    console.log("BULK ADD TO CART ERROR:", err);

    return res.status(500).json({
      success: false,
      msg: "Server Error",
    });
  }
};
