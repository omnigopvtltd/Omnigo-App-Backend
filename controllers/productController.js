const Product = require("../models/Product");

// ================= IMAGE HELPER =================
const getImageUrl = (req) => {
  if (!req.file) return "";
  return `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
};


// ================= GET ALL PRODUCTS =================
exports.getProducts = async (req, res) => {
  try {
    const { category, q } = req.query;

    let filter = {};

    if (category) filter.category = category;
    if (q) filter.name = { $regex: q, $options: "i" };

    const products = await Product.find(filter).sort({ createdAt: -1 });

    res.json(products);

  } catch (error) {
    console.log("❌ GET PRODUCTS ERROR:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};


// ================= GET SINGLE PRODUCT =================
exports.getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(product);

  } catch (error) {
    console.log("❌ GET PRODUCT ERROR:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};


// ================= CREATE PRODUCT =================
exports.createProduct = async (req, res) => {
  try {
    console.log("🔥 BODY:", req.body);
    console.log("🔥 FILE:", req.file);

    const io = req.app.get("io");

    // 🔥 validation manually
    if (!req.body.name || !req.body.price || !req.body.category) {
      return res.status(400).json({
        message: "Name, price, category are required ❗"
      });
    }

    const product = await Product.create({
      name: req.body.name,
      price: Number(req.body.price),
      category: req.body.category,
      stock: Number(req.body.stock || 0),
      description: req.body.description || "",
      image: getImageUrl(req) || "",
      likes: [],
    });

    if (io) io.emit("product_created", product);

    res.status(201).json({
      message: "Product created successfully",
      product,
    });

  } catch (error) {
    console.log("❌ CREATE PRODUCT ERROR:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};


// ================= UPDATE PRODUCT =================
exports.updateProduct = async (req, res) => {
  try {
    const io = req.app.get("io");

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const updatedData = {
      name: req.body.name,
      price: Number(req.body.price),
      category: req.body.category,
      stock: Number(req.body.stock || 0),
      description: req.body.description,
    };

    if (req.file) {
      updatedData.image = getImageUrl(req);
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      updatedData,
      { new: true }
    );

    if (io) io.emit("product_updated", updatedProduct);

    res.json({
      message: "Product updated successfully",
      product: updatedProduct,
    });

  } catch (error) {
    console.log("UPDATE ERROR:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};


// ================= DELETE PRODUCT =================
exports.deleteProduct = async (req, res) => {
  try {
    const io = req.app.get("io");

    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (io) io.emit("product_deleted", { id: product._id });

    res.json({ message: "Product deleted successfully" });

  } catch (error) {
    console.log("DELETE ERROR:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};


// ================= LIKE PRODUCT (NO AUTH) =================
exports.likeProduct = async (req, res) => {
  try {
    const io = req.app.get("io");

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    product.likes.push("guest"); 
    await product.save();

    if (io) {
      io.emit("product_liked", {
        productId: product._id,
        likes: product.likes.length,
      });
    }

    res.json({
      message: "Liked",
      likes: product.likes.length,
    });

  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};


// ================= UNLIKE PRODUCT =================
exports.unlikeProduct = async (req, res) => {
  try {
    const io = req.app.get("io");

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    product.likes.pop(); // simple remove
    await product.save();

    if (io) {
      io.emit("product_unliked", {
        productId: product._id,
        likes: product.likes.length,
      });
    }

    res.json({
      message: "Unliked",
      likes: product.likes.length,
    });

  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};