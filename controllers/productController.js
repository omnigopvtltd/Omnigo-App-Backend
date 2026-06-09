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

    let filter = {
      isActive: true,
    };

    if (category) {
      filter.category = category;
    }

    if (q) {
      filter.name = { $regex: q, $options: "i" };
    }

    const products = await Product.find(filter).sort({
      createdAt: -1,
    });

    const formattedProducts = products.map((item) => ({
      id: item._id,
      name: item.name,
      weight: item.weight,
      image: item.image,
      description: item.description,
      price: item.price,
      quantity: item.quantity,
      category: item.category,
      likes: item.likes.length,
      createdAt: item.createdAt,
    }));

    res.status(200).json(formattedProducts);
  } catch (error) {
    console.log("❌ GET PRODUCTS ERROR:", error);

    res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  }
};

// ================= GET SINGLE PRODUCT =================
exports.getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    res.status(200).json({
      id: product._id,
      name: product.name,
      weight: product.weight,
      image: product.image,
      description: product.description,
      price: product.price,
      quantity: product.quantity,
      category: product.category,
      likes: product.likes.length,
      createdAt: product.createdAt,
    });
  } catch (error) {
    console.log("❌ GET PRODUCT ERROR:", error);

    res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  }
};

// ================= CREATE PRODUCT =================
exports.createProduct = async (req, res) => {
  try {
    console.log("🔥 BODY:", req.body);
    console.log("🔥 FILE:", req.file);

    const io = req.app.get("io");

    if (!req.body) {
      return res.status(400).json({
        message: "Request body missing",
      });
    }

    const {
      name,
      weight,
      price,
      quantity,
      category,
      description,
    } = req.body;

    if (!name || !price) {
      return res.status(400).json({
        message: "Name and price are required",
      });
    }

    const product = await Product.create({
      name,
      weight: weight || "",
      price: Number(price),
      quantity: Number(quantity || 0),
      category: category || "",
      description: description || "",
      image: getImageUrl(req),
      likes: [],
    });

    if (io) {
      io.emit("product_created", product);
    }

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      product,
    });
  } catch (error) {
    console.log("❌ CREATE PRODUCT ERROR:", error);

    res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  }
};

// ================= UPDATE PRODUCT =================
exports.updateProduct = async (req, res) => {
  try {
    const io = req.app.get("io");

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    const updatedData = {
      name: req.body.name,
      weight: req.body.weight,
      price: Number(req.body.price),
      quantity: Number(req.body.quantity || 0),
      category: req.body.category,
      description: req.body.description,
    };

    if (req.file) {
      updatedData.image = getImageUrl(req);
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      updatedData,
      {
        new: true,
        runValidators: true,
      }
    );

    if (io) {
      io.emit("product_updated", updatedProduct);
    }

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      product: updatedProduct,
    });
  } catch (error) {
    console.log("❌ UPDATE PRODUCT ERROR:", error);

    res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  }
};

// ================= DELETE PRODUCT =================
exports.deleteProduct = async (req, res) => {
  try {
    const io = req.app.get("io");

    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    if (io) {
      io.emit("product_deleted", {
        id: product._id,
      });
    }

    res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.log("❌ DELETE PRODUCT ERROR:", error);

    res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  }
};

// ================= LIKE PRODUCT =================
exports.likeProduct = async (req, res) => {
  try {
    const io = req.app.get("io");

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    product.likes.push(new Product.base.Types.ObjectId());

    await product.save();

    if (io) {
      io.emit("product_liked", {
        productId: product._id,
        likes: product.likes.length,
      });
    }

    res.status(200).json({
      success: true,
      message: "Liked",
      likes: product.likes.length,
    });
  } catch (error) {
    console.log("❌ LIKE PRODUCT ERROR:", error);

    res.status(500).json({
      message: "Server Error",
    });
  }
};

// ================= UNLIKE PRODUCT =================
exports.unlikeProduct = async (req, res) => {
  try {
    const io = req.app.get("io");

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    if (product.likes.length > 0) {
      product.likes.pop();
      await product.save();
    }

    if (io) {
      io.emit("product_unliked", {
        productId: product._id,
        likes: product.likes.length,
      });
    }

    res.status(200).json({
      success: true,
      message: "Unliked",
      likes: product.likes.length,
    });
  } catch (error) {
    console.log("❌ UNLIKE PRODUCT ERROR:", error);

    res.status(500).json({
      message: "Server Error",
    });
  }
};

// ================= GET ALL CATEGORIES =================
exports.getCategories = async (req, res) => {
  try {
    const categories = await Product.distinct("category", {
      isActive: true,
    });

    res.status(200).json(categories);
  } catch (error) {
    console.log("❌ GET CATEGORIES ERROR:", error);

    res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  }
};