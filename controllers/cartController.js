const Cart = require("../models/Cart");
const Product = require("../models/Product");
const { getIO } = require("../socket");

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
      const { productId, quantity = 1 } = newItem;

      if (!productId) continue;

      // Verify product exists in database
      const product = await Product.findById(productId);
      if (!product) continue;

      const qty = Number(quantity) || 1;

      // Check if product is already in cart
      const existingIndex = cart.items.findIndex(
        (item) => item.productId.toString() === productId.toString()
      );

      if (existingIndex > -1) {
        // Update quantity & total
        cart.items[existingIndex].quantity += qty;
        cart.items[existingIndex].total =
          cart.items[existingIndex].quantity * cart.items[existingIndex].price;
      } else {
        // Add new item entry
        cart.items.push({
          productId: product._id,
          orderFrom: newItem.orderFrom || "fast-food",
          name: product.name,
          image: product.image,
          category: product.category,
          weight: product.weight,
          price: product.price,
          quantity: qty,
          total: product.price * qty,
        });
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
      (item) => item.productId.toString() === productId.toString(),
    );

    if (!item) {
      return res.status(404).json({
        success: false,
        msg: "Item not found",
      });
    }

    item.quantity = Number(quantity);

    // quantity <= 0 ho to remove
    cart.items = cart.items.filter((item) => item.quantity > 0);

    await cart.save();

    io.to(`user_${req.user.id}`).emit("cart_updated", cart);

    res.status(200).json({
      success: true,
      msg: "Cart updated",
      cart,
    });
  } catch (err) {
    console.log("UPDATE CART ERROR:", err);

    res.status(500).json({
      success: false,
      msg: "Server Error",
    });
  }
};

// ================= REMOVE ITEM =================
exports.removeItem = async (req, res) => {
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

    cart.items = cart.items.filter(
      (item) => item.productId.toString() !== req.params.id.toString(),
    );

    await cart.save();

    io.to(`user_${req.user.id}`).emit("cart_updated", cart);

    res.status(200).json({
      success: true,
      msg: "Item removed",
      cart,
    });
  } catch (err) {
    console.log("REMOVE ITEM ERROR:", err);

    res.status(500).json({
      success: false,
      msg: "Server Error",
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

    io.to(`user_${req.user.id}`).emit("cart_updated", cart);

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
          image: product.image,
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
