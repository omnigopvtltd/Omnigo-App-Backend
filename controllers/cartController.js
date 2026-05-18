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
      return res.status(400).json({ msg: "ProductId required" });
    }

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ msg: "Product not found" });
    }

    // 🔥 FIX: ensure same user cart always
    let cart = await Cart.findOne({ userId: req.user.id });

    if (!cart) {
      cart = await Cart.create({
        userId: req.user.id,
        items: [],
      });
    }

    // FIX: proper comparison
    const index = cart.items.findIndex(
      (i) => i.productId.toString() === productId.toString()
    );

    if (index > -1) {
      cart.items[index].quantity += quantity;
    } else {
      cart.items.push({
        productId: product._id,
        name: product.name,
        price: product.price,
        quantity,
      });
    }

    await cart.save();

    // socket emit
    io.to(`user_${req.user.id}`).emit("cart_updated", cart);

    res.json({
      msg: "Added to cart",
      cart,
    });

  } catch (err) {
    console.log("ADD TO CART ERROR:", err);
    res.status(500).json({ msg: "Server Error" });
  }
};


// ================= GET CART =================
exports.getCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.user.id });

    res.json({
      cart: cart || { items: [] },
    });

  } catch (err) {
    res.status(500).json({ msg: "Server Error" });
  }
};


// ================= UPDATE CART =================
exports.updateCart = async (req, res) => {
  try {
    const io = getIO();

    const { productId, quantity } = req.body;

    if (!productId) {
      return res.status(400).json({ msg: "ProductId required" });
    }

    const cart = await Cart.findOne({ userId: req.user.id });

    if (!cart) {
      return res.status(404).json({ msg: "Cart not found" });
    }

    const item = cart.items.find(
      (i) => i.productId.toString() === productId.toString()
    );

    if (!item) {
      return res.status(404).json({ msg: "Item not found" });
    }

    item.quantity = Number(quantity);

    // REMOVE ZERO OR NEGATIVE ITEMS AUTOMATICALLY
    cart.items = cart.items.filter((i) => i.quantity > 0);

    await cart.save();

    io.to(`user_${req.user.id}`).emit("cart_updated", cart);

    res.json({
      msg: "Cart updated",
      cart,
    });

  } catch (err) {
    console.log("UPDATE CART ERROR:", err);
    res.status(500).json({ msg: "Server Error" });
  }
};


// ================= REMOVE ITEM =================
exports.removeItem = async (req, res) => {
  try {
    const io = getIO();

    const cart = await Cart.findOne({ userId: req.user.id });

    if (!cart) {
      return res.status(404).json({ msg: "Cart not found" });
    }

    // FIX: IMPORTANT - productId use karo, not _id
    cart.items = cart.items.filter(
      (i) => i.productId.toString() !== req.params.id
    );

    await cart.save();

    io.to(`user_${req.user.id}`).emit("cart_updated", cart);

    res.json({
      msg: "Item removed",
      cart,
    });

  } catch (err) {
    console.log("REMOVE ITEM ERROR:", err);
    res.status(500).json({ msg: "Server Error" });
  }
};