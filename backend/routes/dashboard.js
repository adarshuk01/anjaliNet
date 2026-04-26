const router = require('express').Router();
const Customer = require('../models/Customer');
const Billing = require('../models/Billing');
const { protect } = require('../middleware/auth');

// GET /api/dashboard/summary
router.get('/summary', protect, async (req, res) => {
  try {
    const { month } = req.query;
    const currentMonth = month || getCurrentMonth();
    const query = { month: currentMonth };

    const [totalCustomers, activeCustomers, billingData, recentPayments] = await Promise.all([
      Customer.countDocuments(),
      Customer.countDocuments({ isActive: true }),
      Billing.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            totalBilled: { $sum: '$amountBilled' },
            totalPaid: { $sum: '$amountPaid' },
            totalBalance: { $sum: '$balance' },
            paidCount: { $sum: { $cond: [{ $eq: ['$balance', 0] }, 1, 0] } },
            unpaidCount: { $sum: { $cond: [{ $gt: ['$balance', 0] }, 1, 0] } },
            totalRecords: { $sum: 1 }
          }
        }
      ]),
      Billing.find({ amountPaid: { $gt: 0 } })
        .populate('customerId', 'name userId')
        .sort({ updatedAt: -1 })
        .limit(10)
    ]);

    const summary = billingData[0] || {};
    res.json({
      totalCustomers,
      activeCustomers,
      totalBilled: summary.totalBilled || 0,
      totalPaid: summary.totalPaid || 0,
      totalBalance: summary.totalBalance || 0,
      paidCount: summary.paidCount || 0,
      unpaidCount: summary.unpaidCount || 0,
      totalRecords: summary.totalRecords || 0,
      recentPayments,
      currentMonth
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/dashboard/monthly-trend
router.get('/monthly-trend', protect, async (req, res) => {
  try {
    const trend = await Billing.aggregate([
      {
        $group: {
          _id: '$month',
          totalBilled: { $sum: '$amountBilled' },
          totalPaid: { $sum: '$amountPaid' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      { $limit: 12 }
    ]);
    res.json(trend);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/dashboard/payment-breakdown
router.get('/payment-breakdown', protect, async (req, res) => {
  try {
    const { month } = req.query;
    const match = month ? { month } : {};
    const breakdown = await Billing.aggregate([
      { $match: match },
      { $group: { _id: '$paymentType', count: { $sum: 1 }, total: { $sum: '$amountPaid' } } },
      { $sort: { total: -1 } }
    ]);
    res.json(breakdown);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/dashboard/unpaid
router.get('/unpaid', protect, async (req, res) => {
  try {
    const { month } = req.query;
    const query = { balance: { $gt: 0 } };
    if (month) query.month = month;
    const unpaid = await Billing.find(query)
      .populate('customerId', 'name userId mobile')
      .sort({ balance: -1 })
      .limit(20);
    res.json(unpaid);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

function getCurrentMonth() {
  const now = new Date();
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  return `${months[now.getMonth()]}-${String(now.getFullYear()).slice(2)}`;
}

module.exports = router;
