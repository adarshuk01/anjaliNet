const router = require('express').Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '24h' });

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });
    const user = await User.findOne({ email, isActive: true });
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ message: 'Invalid credentials' });
    user.lastLogin = new Date();
    await user.save();
    res.json({
      token: generateToken(user._id),
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/auth/me
router.get('/me', protect, (req, res) => {
  res.json({ id: req.user._id, name: req.user.name, email: req.user.email, role: req.user.role });
});

// PUT /api/auth/change-password
router.put('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);
    if (!(await user.matchPassword(currentPassword)))
      return res.status(400).json({ message: 'Current password incorrect' });
    user.password = newPassword;
    await user.save();
    res.json({ message: 'Password updated' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/seed — create first admin (only if no users exist)
router.post('/seed', async (req, res) => {
  try {
    const count = await User.countDocuments();
    if (count > 0) return res.status(400).json({ message: 'Users already exist' });
    const admin = await User.create({ name: 'Admin', email: 'admin@anjalicomm.in', password: 'admin123', role: 'admin' });
    res.json({ message: 'Admin created', email: admin.email });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
