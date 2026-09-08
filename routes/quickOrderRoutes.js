const express = require("express");
const router = express.Router();
const multer = require('multer');
const { 
  createQuickOrder, 
//   adjustPriceByRider, 
//   respondToPriceUpdate 
} = require('../controllers/quickOrderController.js');

const upload = multer({ storage: multer.memoryStorage() });

// Unified Parsing Route for Food, Mart, Pharmacy (Text or Upload Image)
router.post('/parse', upload.single('image'), createQuickOrder);

// // Price adjustments
// router.patch('/:orderId/adjust-price', adjustPriceByRider);
// router.patch('/:orderId/respond-price', respondToPriceUpdate);

module.exports = router;