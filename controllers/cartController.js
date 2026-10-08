const Cart = require("../models/Cart");
const Product = require("../models/Product");
// const { getIO } = require("../socket");

// const Product = require("../models/Product");
const Deal = require("../models/Deal");
const Campaign = require("../models/Campaign");

// ================= ADD TO CART =================
exports.addToCart = async (req, res) => {
  try {
    const io = req.app.get("io");
    const { items } = req.body;

    // 1. Array validation check
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        msg: "Please select at least one item",
      });
    }

    // 2. Fetch or create user cart
    let cart = await Cart.findOne({ userId: req.user.id });
    if (!cart) {
      cart = new Cart({
        userId: req.user.id,
        items: [],
      });
    }

    // 3. Process each item in the array
    for (const newItem of items) {
      // Single ID incoming from frontend (could be productId, itemId, or id)
      const itemId = newItem.productId || newItem.itemId || newItem.id;
      if (!itemId) continue;

      const qty = Number(newItem.quantity) || 1;

      const incomingAddOns = Array.isArray(newItem.addOns)
        ? newItem.addOns
        : [];
      const addOnsPrice = incomingAddOns.reduce(
        (sum, addOn) => sum + (Number(addOn.price) || 0),
        0,
      );

      const incomingVariations = Array.isArray(newItem.variations)
        ? newItem.variations
        : [];
      const variationsPrice = incomingVariations.reduce(
        (sum, variations) => sum + (Number(variations.price) || 0),
        0,
      );

      // ----------------------------------------------------
      // AUTO-MATCH ID WITH PRODUCT, DEAL, OR CAMPAIGN
      // ----------------------------------------------------
      const [product, deal, campaign] = await Promise.all([
        Product.findById(itemId).lean(),
        Deal.findById(itemId).lean(),
        Campaign.findById(itemId).lean(),
      ]);

      const matchedEntity = product || deal || campaign;

      if (!matchedEntity) continue; // If ID doesn't match anything, skip

      // Determine entity type
      let entityType = "product";
      if (deal) entityType = "deal";
      else if (campaign) entityType = "campaign";

      // Check if item already exists in user's cart
      const existingIndex = cart.items.findIndex((item) => {
        if (entityType === "product" && item.productId) {
          return item.productId.toString() === itemId.toString();
        }
        if (entityType === "deal" && item.productId) {
          return item.productId.toString() === itemId.toString();
        }
        if (entityType === "campaign" && item.campaignId) {
          return item.productId.toString() === itemId.toString();
        }
        return false;
      });

      // Price determination
      const itemPrice = Number(
        matchedEntity.discountPrice ||
          matchedEntity.price ||
          newItem.price ||
          0,
      );

      // if (existingIndex > -1) {
      //   // Update quantity & total if already in cart
      //   cart.items[existingIndex].quantity += qty;
      //   cart.items[existingIndex].total =
      //     cart.items[existingIndex].addOns.reduce(
      //       (sum, addOn) => sum + (addOn.price || 0),
      //       0,
      //     ) +
      //     cart.items[existingIndex].quantity * cart.items[existingIndex].price;
      // }
      if (existingIndex > -1) {
  const existingItem = cart.items[existingIndex];

  if (incomingAddOns.length > 0) existingItem.addOns = incomingAddOns;
  if (newItem.variations) existingItem.variations = newItem.variations;

  existingItem.quantity += qty;

  const currentAddOnsPrice = existingItem.addOns.reduce(
    (sum, addOn) => sum + (Number(addOn.price) || 0),
    0
  );
  const currentVariationsPrice = existingItem.variations.reduce(
    (sum, variations) => sum + (Number(variations.price) || 0),
    0
  );

  // Exact Total Calculation: (Price + AddOns) * Total Quantity
  existingItem.total = (existingItem.price + currentAddOnsPrice + currentVariationsPrice) * existingItem.quantity;
} 
      else {
        // Construct new cart item object
        const cartItem = {
          orderFrom: newItem.orderFrom || "fast-food",
          name:
            matchedEntity.name ||
            matchedEntity.title ||
            matchedEntity.dealName ||
            matchedEntity.campaignName ||
            newItem.name ||
            "Item",
          image:
            matchedEntity.image ||
            (matchedEntity.images && matchedEntity.images[0]) ||
            matchedEntity.campaignBanner ||
            matchedEntity.dealBanner ||
            newItem.image ||
            "",
          category: matchedEntity.category || newItem.category || entityType,
          weight: matchedEntity.weight || newItem.weight || "",
          price: itemPrice || matchedEntity.discountPrice,
          quantity: qty,
          variations: newItem.variations || matchedEntity.variations || [],
          addOns: newItem.addOns || matchedEntity.addOns || [],
          serving: newItem.serving || matchedEntity.serving || "full",
          isVeg: newItem.isVeg ?? matchedEntity.isVeg ?? false,
          total:
            (itemPrice +
              addOnsPrice +
              variationsPrice) *
            qty,
        };

        // Attach specific ID based on match
        if (entityType === "deal") {
          cartItem.productId = matchedEntity._id;
        } else if (entityType === "campaign") {
          cartItem.productId = matchedEntity._id;
        } else {
          cartItem.productId = matchedEntity._id;
        }

        cart.items.push(cartItem);
      }
    }

    await cart.save();

    // 4. Emit socket event
    if (io) {
      io.to(`user:${req.user.id}`).emit("cart_updated", cart);
    }

    return res.status(200).json({
      success: true,
      msg: "Added to cart successfully",
      items: cart.length,
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
// // ================= ADD TO CART =================
// exports.addToCart = async (req, res) => {
//   try {
//     const io = req.app.get("io");
//     const { items } = req.body;

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

//     // 3. Process each item in the array
//     for (const newItem of items) {
//       const { productId, quantity = 1 } = newItem;

//       if (!productId) continue;

//       // Verify product exists in database
//       const product = await Product.findById(productId);
//       if (!product) continue;

//       const qty = Number(quantity) || 1;

//       // Check if product is already in cart
//       const existingIndex = cart.items.findIndex(
//         (item) => item.productId.toString() === productId.toString()
//       );

//       if (existingIndex > -1) {
//         // Update quantity & total
//         cart.items[existingIndex].quantity += qty;
//         cart.items[existingIndex].total =
//           cart.items[existingIndex].quantity * cart.items[existingIndex].price;
//       } else {
//         // Add new item entry
//         cart.items.push({
//           productId: product._id,
//           orderFrom: newItem.orderFrom || "fast-food",
//           name: product.name,
//           image: product.image || product.images[0],
//           category: product.category,
//           weight: product.weight,
//           price: product.price,
//           quantity: qty,
//           variations: product.variations,
//           addOns: product.addOns,
//           serving: product.serving,
//           isVeg: product.isVeg,
//           total: product.price * qty,
//         });
//       }
//     }

//     await cart.save();

//     // 4. Emit socket event
//     if (io) {
//       io.to(`user:${req.user.id}`).emit("cart_updated", cart);
//     }

//     return res.status(200).json({
//       success: true,
//       msg: "Added to cart successfully",
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
// ================= GET CART =================
exports.getCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({
      userId: req.user.id,
    });

    res.status(200).json({
      success: true,
      cart: cart || { items: [] },
    });
  } catch (err) {
    console.log("GET CART ERROR:", err);

    res.status(500).json({
      success: false,
      msg: "Server Error",
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
