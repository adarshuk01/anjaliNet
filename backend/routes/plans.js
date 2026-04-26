const router = require('express').Router();
const Plan = require('../models/Plan');
const { protect, admin } = require('../middleware/auth');

router.get('/', protect, async (req, res) => {
  try {
    const plans = await Plan.find({ isActive: true }).sort({ basePrice: 1 });
    res.json(plans);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', protect, admin, async (req, res) => {
  try {
    const plan = await Plan.create(req.body);
    res.status(201).json(plan);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'Plan code already exists' });
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', protect, admin, async (req, res) => {
  try {
    const plan = await Plan.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(plan);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', protect, admin, async (req, res) => {
  try {
    await Plan.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ message: 'Plan deactivated' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Seed default plans
router.post('/seed', protect, admin, async (req, res) => {
  try {
    const plans = [
      { planCode: 'FUP20M2000G', planName: '20 Mbps FUP', speed: '20 Mbps', dataLimit: '2000 GB', basePrice: 499 },
      { planCode: 'FUP30M2500G', planName: '30 Mbps FUP', speed: '30 Mbps', dataLimit: '2500 GB', basePrice: 599 },
      { planCode: 'FUP50M2000G', planName: '50 Mbps FUP', speed: '50 Mbps', dataLimit: '2000 GB', basePrice: 699 },
      { planCode: 'FUP50M5000G', planName: '50 Mbps FUP 5TB', speed: '50 Mbps', dataLimit: '5000 GB', basePrice: 899 },
      { planCode: 'FUP100M4000G', planName: '100 Mbps FUP', speed: '100 Mbps', dataLimit: '4000 GB', basePrice: 999 },
      { planCode: 'FUP200M4500G', planName: '200 Mbps FUP', speed: '200 Mbps', dataLimit: '4500 GB', basePrice: 1499 },
      { planCode: 'FUP300M5000G', planName: '300 Mbps FUP', speed: '300 Mbps', dataLimit: '5000 GB', basePrice: 1999 },
      { planCode: 'SME100M', planName: 'SME Business 100M', speed: '100 Mbps', dataLimit: 'Unlimited', basePrice: 2499 },
      { planCode: 'UL50M', planName: 'Unlimited 50 Mbps', speed: '50 Mbps', dataLimit: 'Unlimited', basePrice: 799 },
    ];
    await Plan.insertMany(plans, { ordered: false });
    res.json({ message: 'Plans seeded' });
  } catch {
    res.json({ message: 'Some plans may already exist' });
  }
});

module.exports = router;
