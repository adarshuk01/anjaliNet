const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true, trim: true },
  name: { type: String, required: true, trim: true },
  crfNumber: { type: String, trim: true },
  mobile: { type: String, required: true, trim: true },
  whatsapp: { type: String, trim: true },
  address: { type: String, trim: true },
  registrationDate: { type: Date, default: Date.now },
  currentPlan: { type: String, trim: true },
  installationDate: { type: Date },
  cableRent: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  notes: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

customerSchema.index({ name: 'text', userId: 'text', mobile: 'text', crfNumber: 'text' });

module.exports = mongoose.model('Customer', customerSchema);
