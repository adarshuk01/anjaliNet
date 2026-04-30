const router = require('express').Router();
const Customer = require('../models/Customer');
const Billing = require('../models/Billing');
const { protect, agentOrAdmin } = require('../middleware/auth');

/**
 * POST /api/import/customers
 * Body: { customers: [ { userId, name, mobile, crfNumber, registrationDate, ... } ] }
 * Upserts customers by userId — skips duplicates, updates existing ones.
 */
router.post('/customers', protect, agentOrAdmin, async (req, res) => {
  try {
    const { customers = [] } = req.body;
    if (!Array.isArray(customers) || customers.length === 0) {
      return res.status(400).json({ message: 'No customers provided' });
    }

    let inserted = 0;
    let updated  = 0;
    let skipped  = 0;
    const errors = [];

    for (const c of customers) {
      if (!c.userId || !c.name) { skipped++; continue; }
      try {
        const result = await Customer.findOneAndUpdate(
          { userId: c.userId },
          {
            $setOnInsert: { createdBy: req.user._id },
            $set: {
              name:   c.name.trim(),
              mobile: (c.mobile || '').trim(),
              crfNumber: (c.crfNumber || '').trim(),
              registrationDate: c.registrationDate ? new Date(c.registrationDate) : undefined,
              isActive: true,
            }
          },
          { upsert: true, new: true, runValidators: true }
        );
        if (result.createdAt && (new Date() - new Date(result.createdAt)) < 5000) {
          inserted++;
        } else {
          updated++;
        }
      } catch (err) {
        errors.push(`${c.userId}: ${err.message}`);
        skipped++;
      }
    }

    res.json({ inserted, updated, skipped, errors: errors.slice(0, 20) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * POST /api/import/billing
 * Body: { records: [ { customerUserId, month, amountBilled, ... } ] }
 * Looks up each customer by userId, then upserts billing record by (customerId + month).
 * Skips records where customer not found.
 */
router.post('/billing', protect, agentOrAdmin, async (req, res) => {
  try {
    const { records = [] } = req.body;
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ message: 'No records provided' });
    }

    // Build a userId → _id cache for all unique userIds in this batch
    const userIds = [...new Set(records.map(r => r.customerUserId).filter(Boolean))];
    const customers = await Customer.find({ userId: { $in: userIds } }).select('_id userId');
    const customerMap = {};
    customers.forEach(c => { customerMap[c.userId] = c._id; });

    let inserted = 0;
    let updated  = 0;
    let skipped  = 0;
    const errors = [];

    // Running bill number counter
    let billCount = await Billing.countDocuments();

    for (const rec of records) {
      const customerId = customerMap[rec.customerUserId];
      if (!customerId) {
        skipped++;
        errors.push(`${rec.customerUserId}: customer not found — import customers first`);
        continue;
      }

      if (!rec.month) { skipped++; continue; }

      try {
        // Fix — add cableRent:
const balance = Math.max(
  0,
  (Number(rec.oldBalance) || 0) +
  (Number(rec.amountBilled) || 0) +
  (Number(rec.cableRent)   || 0) -
  (Number(rec.amountPaid)  || 0)
);

        // Auto bill number if missing
        let billNumber = rec.billNumber;
        if (!billNumber) {
          billCount++;
          billNumber = `AN${String(55000 + billCount).padStart(5, '0')}`;
        }

        const result = await Billing.findOneAndUpdate(
          { customerId, month: rec.month },
          {
            $setOnInsert: { createdBy: req.user._id, customerUserId: rec.customerUserId },
            $set: {
              billingDate:  rec.billingDate  ? new Date(rec.billingDate)  : undefined,
              plan:         rec.plan         || undefined,
              paymentType:  rec.paymentType  || 'Cash',
              cableRent:    Number(rec.cableRent)   || 0,
              amountBilled: Number(rec.amountBilled) || 0,
              oldBalance:   Number(rec.oldBalance)   || 0,
              amountPaid:   Number(rec.amountPaid)   || 0,
              balance,
              paidDate:     rec.paidDate ? new Date(rec.paidDate) : undefined,
              billNumber,
              remarks:      rec.remarks || undefined,
            }
          },
          { upsert: true, new: true }
        );

        if (result.createdAt && (new Date() - new Date(result.createdAt)) < 5000) {
          inserted++;
        } else {
          updated++;
        }
      } catch (err) {
        errors.push(`${rec.customerUserId}/${rec.month}: ${err.message}`);
        skipped++;
      }
    }

    res.json({ inserted, updated, skipped, errors: errors.slice(0, 20) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
