const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key_here', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const [users] = await pool.execute(
      'SELECT is_admin FROM users WHERE id = ?',
      [req.user.userId]
    );

    if (users.length === 0 || !users[0].is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    next();
  } catch (error) {
    console.error('Admin authorization error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { authenticateToken, requireAdmin };

