const router = require("express").Router();
const upload = require("../middleware/upload");

const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  likeProduct,
  unlikeProduct
} = require("../controllers/productController");


// ================= PUBLIC ROUTES =================
router.get("/", getProducts);
router.get("/:id", getProduct);


// ================= CRUD WITHOUT AUTH =================

// CREATE
router.post("/", upload.single("image"), createProduct);

// UPDATE
router.put("/:id", upload.single("image"), updateProduct);

// DELETE
router.delete("/:id", deleteProduct);


// ================= LIKE SYSTEM =================
router.post("/:id/like", likeProduct);
router.post("/:id/unlike", unlikeProduct);


module.exports = router;