import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  quantity: { type: Number, required: true, default: 1 },
  estimatedUnitPrice: { type: Number, required: true },
  totalItemPrice: { type: Number, required: true }
});

const quickOrderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  orderType: { type: String, enum: ['TEXT', 'IMAGE'], default: 'TEXT' },
  rawInput: { type: String }, // User input text or image URL
  
  items: [orderItemSchema],
  subtotal: { type: Number, required: true },
  deliveryFee: { type: Number, default: 2.00 },
  grandTotal: { type: Number, required: true },
  
  customerNotes: { type: String, default: '' },
  
  status: { 
    type: String, 
    enum: ['PROPOSED', 'PRICE_UPDATED', 'CONFIRMED', 'CANCELLED'], 
    default: 'PROPOSED' 
  },
  
  // Track rider adjustments for transparency
  priceAdjustments: [{
    updatedBy: { type: String, enum: ['ADMIN', 'RIDER'] },
    reason: { type: String },
    oldTotal: { type: Number },
    newTotal: { type: Number },
    timestamp: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

export default mongoose.model('QuickOrder', quickOrderSchema);