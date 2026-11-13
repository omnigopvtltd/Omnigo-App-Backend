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
const auth = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");
const rl = require("express-rate-limit");                             // npm i express-rate-limit
// const rateLimit = rl.rateLimit || rl;
// const ipKeyGenerator = rl.ipKeyGenerator;                             // v8+ mein hota ha, purane version mein undefined (theek ha)
const c = require("../controllers/quickOrderController");

// AI endpoint par per-user limit: koi script aap ke AI credits na jala de
// const parseLimiter = rateLimit({
//   windowMs: 60 * 1000,
//   limit: 10,
//   max: 10,                                                                // purane version ka naam
//   standardHeaders: true,
//   legacyHeaders: false,
//   keyGenerator: (req) => (req.user?.id ? String(req.user.id) : ipKeyGenerator ? ipKeyGenerator(req.ip) : req.ip),
//   message: { success: false, message: "Too many requests. Please try again in a minute." },
// });

router.use(auth);

router.post("/parse",  upload.memoryUpload.single("image"), c.createQuickOrder);  // text/photo -> products (slip nahi)
router.get("/search", c.searchCatalog);                    // typing / "Add more items" search
router.post("/quote", c.quote);                            // selections ka price preview (kuch save nahi)
router.post("/slip", c.createSlip);                        // "Generate slip"
router.put("/edit", c.editQuickOrder);                     // qty / variation / add-ons / addItems / removeItemIds
router.post("/add-to-cart", c.addToCart);                  // "Add Items into cart"
router.get("/debug-match", c.debugMatch);                  // sirf QUICK_ORDER_DEBUG=true par

module.exports = router;