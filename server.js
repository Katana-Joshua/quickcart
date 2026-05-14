const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const compression = require('compression');
const next = require('next');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const nextApp = next({
  dev: process.env.NODE_ENV !== 'production',
  dir: path.join(__dirname, 'dashboard'),
});
const handleNextRequest = nextApp.getRequestHandler();

// Middleware
app.use(compression()); // Enable gzip compression for responses
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' })); // Limit JSON payload size
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Serve static assets.
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/panel', require('./routes/admin_panel'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'QuickCart API is running' });
});

nextApp.prepare().then(() => {
  app.all('*', (req, res) => handleNextRequest(req, res));

  // Error handling middleware
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`QuickCart Dashboard: http://localhost:${PORT}`);
    console.log(`QuickCart API: http://localhost:${PORT}/api/health`);
  });
});

