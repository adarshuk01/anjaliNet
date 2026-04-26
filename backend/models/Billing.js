const mongoose = require('mongoose');

const billingSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  customerUserId: { type: String, required: true },
  month: { type: String, required: true }, // e.g. APR-26
  billingDate: { type: Date, default: Date.now },
  plan: { type: String },
  paymentType: {
    type: String,
    enum: ['Cash', 'SBI', 'Online', 'Mini', 'Vishnu', 'Premji', 'Bill', 'S', 'Other'],
    default: 'Cash'
  },
  cableRent: { type: Number, default: 0 },
  amountBilled: { type: Number, required: true },
  oldBalance: { type: Number, default: 0 },
  amountPaid: { type: Number, default: 0 },
  balance: { type: Number, default: 0 },
  paidDate: { type: Date },
  billNumber: { type: String },
  remarks: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

billingSchema.index({ month: 1, customerId: 1 });
billingSchema.index({ balance: 1 });

module.exports = mongoose.model('Billing', billingSchema);
