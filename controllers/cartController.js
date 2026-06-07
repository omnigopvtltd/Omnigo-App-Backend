const Cart = require("../models/Cart");
const Product = require("../models/Product");
const { getIO } = require("../socket");

// ================= ADD TO CART =================
exports.addToCart = async (req, res) => {
  try {
    const io = getIO();

    let { productId, quantity } = req.body;
    quantity = Number(quantity) || 1;

    if (!productId) {
      return res.status(400).json({
        success: false,
        msg: "ProductId required",
      });
    }

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        msg: "Product not found",
      });
    }

    let cart = await Cart.findOne({ userId: req.user.id });

    if (!cart) {
      cart = new Cart({
        userId: req.user.id,
        items: [],
      });
    }

    const index = cart.items.findIndex(
      (item) => item.productId.toString() === productId.toString()
    );

    if (index > -1) {
      cart.items[index].quantity += quantity;
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

    await cart.save();

    io.to(`user_${req.user.id}`).emit("cart_updated", cart);

    res.status(200).json({
      success: true,
      msg: "Added to cart",
      cart,
    });
  } catch (err) {
    console.log("ADD TO CART ERROR:", err);

    res.status(500).json({
      success: false,
      msg: "Server Error",
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
    const io = getIO();

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
      (item) => item.productId.toString() === productId.toString()
    );

    if (!item) {
      return res.status(404).json({
        success: false,
        msg: "Item not found",
      });
    }

    item.quantity = Number(quantity);

    // quantity <= 0 ho to remove
    cart.items = cart.items.filter(
      (item) => item.quantity > 0
    );

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
    const io = getIO();

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
      (item) =>
        item.productId.toString() !== req.params.id.toString()
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
    const io = getIO();

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
    const io = getIO();

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
        (cartItem) =>
          cartItem.productId.toString() === product._id.toString()
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