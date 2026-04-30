const router = require('express').Router();
const Billing = require('../models/Billing');
const Customer = require('../models/Customer');
const { protect, admin, agentOrAdmin } = require('../middleware/auth');

// GET /api/billing
router.get('/', protect, async (req, res) => {
  try {
    const { month, page = 1, limit = 50, search, status, paymentType } = req.query;
    const query = {};
    if (month) query.month = month;
    if (paymentType) query.paymentType = paymentType;

    // FIX: unpaid must have amountPaid === 0, not just balance > 0
    // (balance > 0 alone also matches partial payments)
    if (status === 'paid')    { query.balance = 0; }
    if (status === 'unpaid')  { query.amountPaid = 0; query.balance = { $gt: 0 }; }
    if (status === 'partial') { query.amountPaid = { $gt: 0 }; query.balance = { $gt: 0 }; }

    if (search) {
      const customers = await Customer.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { userId: { $regex: search, $options: 'i' } }
        ]
      }).select('_id');
      query.customerId = { $in: customers.map(c => c._id) };
    }

    const total = await Billing.countDocuments(query);
    const records = await Billing.find(query)
      .populate('customerId', 'name userId mobile')
      .sort({ billingDate: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const summary = await Billing.aggregate([
      { $match: month ? { month } : {} },
      { $group: { _id: null, totalBilled: { $sum: '$amountBilled' }, totalPaid: { $sum: '$amountPaid' }, totalBalance: { $sum: '$balance' }, count: { $sum: 1 } } }
    ]);

    res.json({ records, total, summary: summary[0] || {}, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/billing
router.post('/', protect, agentOrAdmin, async (req, res) => {
  try {
    const data = { ...req.body, createdBy: req.user._id };
data.balance = (data.oldBalance || 0) + (data.amountBilled || 0) + (data.cableRent || 0) - (data.amountPaid || 0); 
   if (!data.billNumber) {
      const count = await Billing.countDocuments();
      data.billNumber = `AN${String(55000 + count + 1).padStart(5, '0')}`;
    }
    const record = await Billing.create(data);
    const populated = await record.populate('customerId', 'name userId mobile');
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/billing/months
router.get('/months', protect, async (req, res) => {
  try {
    const months = await Billing.distinct('month');
    res.json(months.sort().reverse());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/billing/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const record = await Billing.findById(req.params.id).populate('customerId', 'name userId mobile');
    if (!record) return res.status(404).json({ message: 'Record not found' });
    res.json(record);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/billing/:id
router.put('/:id', protect, agentOrAdmin, async (req, res) => {
  try {
    const data = { ...req.body };
     data.balance = (data.oldBalance || 0) + (data.amountBilled || 0) + (data.cableRent || 0) - (data.amountPaid || 0);
    const record = await Billing.findByIdAndUpdate(req.params.id, data, { new: true })
      .populate('customerId', 'name userId mobile');
    if (!record) return res.status(404).json({ message: 'Record not found' });
    res.json(record);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/billing/:id/pay
router.post('/:id/pay', protect, agentOrAdmin, async (req, res) => {
  try {
    const { amountPaid, paymentType, paidDate } = req.body;
    const record = await Billing.findById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Record not found' });
    record.amountPaid = amountPaid || record.amountBilled + record.oldBalance;
    record.paymentType = paymentType || record.paymentType;
    record.paidDate = paidDate || new Date();
    record.balance = record.oldBalance + record.amountBilled + (record.cableRent || 0) - record.amountPaid;
    await record.save();
    res.json(record);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/billing/:id
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    await Billing.findByIdAndDelete(req.params.id);
    res.json({ message: 'Record deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;