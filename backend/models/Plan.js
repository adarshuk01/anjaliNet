const mongoose = require('mongoose');

const planSchema = new mongoose.Schema({
  planCode: { type: String, required: true, unique: true, trim: true },
  planName: { type: String, trim: true },
  speed: { type: String, trim: true },
  dataLimit: { type: String, trim: true },
  basePrice: { type: Number, required: true },
  gstRate: { type: Number, default: 18 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Plan', planSchema);
