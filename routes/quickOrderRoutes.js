// const express = require("express");
// const router = express.Router();
// // const multer = require('multer');
// const { 
//   createQuickOrder,
//   confirmQuickOrderToMainOrder,
//   editQuickOrder, 
// //   adjustPriceByRider, 
// //   respondToPriceUpdate 
// } = require('../controllers/quickOrderController.js');

// const upload = require("../middleware/upload");

// // Unified Parsing Route for Food, Mart, Pharmacy (Text or Upload Image)
// router.post('/parse', upload.memoryUpload.single('image'), createQuickOrder);
// // Step 2: Convert Parsed Quick Order to Live Main Order
// router.post("/confirm", confirmQuickOrderToMainOrder);
// router.put("/edit", editQuickOrder);

// // // Price adjustments
// // router.patch('/:orderId/adjust-price', adjustPriceByRider);
// // router.patch('/:orderId/respond-price', respondToPriceUpdate);

// module.exports = router;


// ==============================================

// routes/quickOrderRoutes.js
const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");            // <- jo auth middleware createOrder route par ha wahi lagayen
const upload = require("../middleware/upload");
const rateLimit = require("express-rate-limit");              // npm i express-rate-limit
const c = require("../controllers/quickOrderController");

// AI endpoint par per-user limit: koi script aap ke credits na jala de
const parseLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  keyGenerator: (req) => req.user?.id || req.ip,
  message: { success: false, message: "Bohat zyada requests, 1 minute baad try karein" },
});

router.use(auth);

router.post("/parse", parseLimiter, upload.memoryUpload.single("image"), c.createQuickOrder);
router.get("/search", c.searchCatalog);                        // user khud product dhoond sake
router.patch("/item", c.updateQuickOrderItem);                 // action: select | remove | keepCustom
router.put("/edit", c.editQuickOrder);
router.post("/confirm", c.confirmQuickOrderToMainOrder);

module.exports = router;

/* ---- middleware/upload.js mein memoryUpload ye hona chahiye ----
const multer = require("multer");
exports.memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },            // 5MB, 1 image
  fileFilter: (req, file, cb) =>
    ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype) ? cb(null, true) : cb(new Error("Only JPG/PNG/WEBP")),
});
*/