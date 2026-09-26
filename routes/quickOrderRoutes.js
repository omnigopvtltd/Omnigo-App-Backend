const express = require("express");
const router = express.Router();
const multer = require('multer');
const { 
  createQuickOrder,
  confirmQuickOrderToMainOrder,
  editQuickOrder, 
//   adjustPriceByRider, 
//   respondToPriceUpdate 
} = require('../controllers/quickOrderController.js');

const upload = multer({ storage: multer.memoryStorage() });

// Unified Parsing Route for Food, Mart, Pharmacy (Text or Upload Image)
router.post('/parse', upload.single('image'), createQuickOrder);
// Step 2: Convert Parsed Quick Order to Live Main Order
router.post("/confirm", confirmQuickOrderToMainOrder);
router.put("/edit", editQuickOrder);

// // Price adjustments
// router.patch('/:orderId/adjust-price', adjustPriceByRider);
// router.patch('/:orderId/respond-price', respondToPriceUpdate);

module.exports = router;