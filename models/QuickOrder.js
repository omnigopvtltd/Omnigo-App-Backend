const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  quantity: { type: Number, required: true, default: 1 },
  dosage: { type: String, default: '' }, // "500mg", "10ml" (Pharmacy)
  estimatedUnitPrice: { type: Number, required: true, default: 0 },
  totalItemPrice: { type: Number, required: true, default: 0 }
});

const quickOrderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  category: { 
    type: String, 
    enum: ['food', 'mart', 'pharmacy', 'grocery'], 
    default: 'food' 
  },
  orderType: { type: String, enum: ['TEXT', 'IMAGE'], default: 'TEXT' },
  rawInputText: { type: String, default: '' },
  prescriptionImageUrl: { type: String, default: '' }, // For Pharmacy 
  
  items: [orderItemSchema],
  subtotal: { type: Number, required: true, default: 0 },
  deliveryFee: { type: Number, default: 2.00 },
  grandTotal: { type: Number, required: true, default: 0 },
  
  customerNotes: { type: String, default: '' },
  
  status: { 
    type: String, 
    enum: ['PROPOSED', 'PRICE_UPDATED', 'CONFIRMED', 'CANCELLED'], 
    default: 'PROPOSED' 
  },
  
  priceAdjustments: [{
    updatedBy: { type: String, enum: ['ADMIN', 'RIDER'] },
    reason: { type: String },
    oldTotal: { type: Number },
    newTotal: { type: Number },
    timestamp: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

module.exports = mongoose.model('QuickOrder', quickOrderSchema);