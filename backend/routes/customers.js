const router = require('express').Router();
const Customer = require('../models/Customer');
const Billing = require('../models/Billing');
const { protect, admin, agentOrAdmin } = require('../middleware/auth');

// GET /api/customers
router.get('/', protect, async (req, res) => {
  try {
    const { page = 1, limit = 25, search, status, plan } = req.query;
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { userId: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } },
        { crfNumber: { $regex: search, $options: 'i' } }
      ];
    }
    if (status === 'active') query.isActive = true;
    if (status === 'inactive') query.isActive = false;
    if (plan) query.currentPlan = { $regex: plan, $options: 'i' };

    const total = await Customer.countDocuments(query);
    const customers = await Customer.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    res.json({ customers, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/customers/search
router.get('/search', protect, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json([]);
    const customers = await Customer.find({
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { userId: { $regex: q, $options: 'i' } },
        { mobile: { $regex: q, $options: 'i' } }
      ]
    }).limit(10).select('userId name mobile currentPlan isActive');
    res.json(customers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/customers
router.post('/', protect, agentOrAdmin, async (req, res) => {
  try {
    const customer = await Customer.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json(customer);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'User ID already exists' });
    res.status(500).json({ message: err.message });
  }
});

// GET /api/customers/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    res.json(customer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/customers/:id
router.put('/:id', protect, agentOrAdmin, async (req, res) => {
  try {
    const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    res.json(customer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/customers/:id (soft delete)
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const customer = await Customer.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    res.json({ message: 'Customer deactivated' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/customers/:id/billing
router.get('/:id/billing', protect, async (req, res) => {
  try {
    const records = await Billing.find({ customerId: req.params.id }).sort({ billingDate: -1 });
    const stats = {
      totalPaid: records.reduce((s, r) => s + r.amountPaid, 0),
      totalOutstanding: records.reduce((s, r) => s + r.balance, 0),
      avgMonthly: records.length ? records.reduce((s, r) => s + r.amountBilled, 0) / records.length : 0,
      monthsActive: records.length
    };
    res.json({ records, stats });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
