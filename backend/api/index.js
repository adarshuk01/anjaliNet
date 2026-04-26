const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// CORS
const allowedOrigins = [process.env.CLIENT_URL, 'http://localhost:5173'].filter(Boolean);
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) callback(null, true);
    else callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('../routes/auth'));
app.use('/api/customers', require('../routes/customers'));
app.use('/api/billing', require('../routes/billing'));
app.use('/api/dashboard', require('../routes/dashboard'));
app.use('/api/plans', require('../routes/plans'));
app.use('/api/users', require('../routes/users'));
app.use('/api/import', require('../routes/import'));

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: err.message || 'Server Error' });
});

// Connect MongoDB once (cached across warm invocations)
let isConnected = false;
const connectDB = async () => {
  if (isConnected) return;
  await mongoose.connect(process.env.MONGODB_URI);
  isConnected = true;
};

// Export handler for Vercel — NO app.listen()
module.exports = async (req, res) => {
  await connectDB();
  return app(req, res);
};