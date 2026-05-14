const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'), false);
  },
});

function absolutePublicUrl(req, pathOrUrl) {
  if (!pathOrUrl) return null;
  const s = String(pathOrUrl).trim();
  if (/^https?:\/\//i.test(s)) return s;
  const proto = (req.get('x-forwarded-proto') || req.protocol || 'https').split(':')[0];
  if (s.startsWith('//')) return `${proto}:${s}`;
  const host = req.get('x-forwarded-host') || req.get('host');
  if (!host) return s.startsWith('/') ? s : `/${s}`;
  if (s.startsWith('/')) return `${proto}://${host}${s}`;
  return `${proto}://${host}/${s}`;
}

/**
 * Public user JSON: never sends profile_image_data. Sets profile_image_url for app.
 */
function userResponseFromRow(row) {
  if (!row) return null;
  const u = {
    id: row.id,
    full_name: row.full_name,
    email: row.email,
    phone: row.phone,
    is_admin: row.is_admin ? 1 : 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
  if (row.profile_image_data) {
    u.profile_image_url = '/api/auth/profile/image';
  } else if (row.profile_image_url) {
    u.profile_image_url = row.profile_image_url;
  } else {
    u.profile_image_url = null;
  }
  return u;
}

// —— Profile image (must be before /profile if ever ambiguous; paths are unique) ——

// GET /api/auth/profile/image — same pattern as product images (bytes or redirect)
router.get('/profile/image', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const [rows] = await pool.execute(
      'SELECT profile_image_data, profile_image_url FROM users WHERE id = ?',
      [userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const r = rows[0];
    if (r.profile_image_data) {
      try {
        const buf = Buffer.from(String(r.profile_image_data).replace(/\s/g, ''), 'base64');
        if (!buf.length) return res.status(404).json({ error: 'Invalid image data' });
        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('Cache-Control', 'private, max-age=3600');
        return res.status(200).send(buf);
      } catch (e) {
        return res.status(404).json({ error: 'Invalid image data' });
      }
    }
    if (r.profile_image_url) {
      return res.redirect(302, absolutePublicUrl(req, r.profile_image_url));
    }
    return res.status(404).json({ error: 'No profile image' });
  } catch (error) {
    console.error('Get profile image error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/profile/image — multipart field "image"
router.post('/profile/image', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Image file is required' });
    }
    const userId = req.user.userId;
    const b64 = req.file.buffer.toString('base64');
    await pool.execute(
      'UPDATE users SET profile_image_data = ?, profile_image_url = NULL, updated_at = NOW() WHERE id = ?',
      [b64, userId]
    );
    const [users] = await pool.execute('SELECT * FROM users WHERE id = ?', [userId]);
    res.json({
      message: 'Profile image updated',
      user: userResponseFromRow(users[0]),
    });
  } catch (error) {
    console.error('Upload profile image error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/auth/profile/image
router.delete('/profile/image', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    await pool.execute(
      'UPDATE users SET profile_image_data = NULL, profile_image_url = NULL, updated_at = NOW() WHERE id = ?',
      [userId]
    );
    const [users] = await pool.execute('SELECT * FROM users WHERE id = ?', [userId]);
    res.json({
      message: 'Profile image removed',
      user: userResponseFromRow(users[0]),
    });
  } catch (error) {
    console.error('Delete profile image error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Sign Up
router.post('/signup', async (req, res) => {
  try {
    const { full_name, email, password } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if user already exists
    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user
    const [result] = await pool.execute(
      'INSERT INTO users (full_name, email, password) VALUES (?, ?, ?)',
      [full_name, email, hashedPassword]
    );

    // Generate JWT token
    const token = jwt.sign(
      { userId: result.insertId, email, isAdmin: false },
      process.env.JWT_SECRET || 'your_jwt_secret_key_here',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: result.insertId,
        full_name,
        email,
        phone: null,
        is_admin: 0,
        profile_image_url: null,
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = users[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, isAdmin: Boolean(user.is_admin) },
      process.env.JWT_SECRET || 'your_jwt_secret_key_here',
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: userResponseFromRow(user)
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Forgot Password (simplified - just returns success for now)
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if user exists
    const [users] = await pool.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      // Don't reveal if email exists for security
      return res.json({ message: 'If email exists, password reset link has been sent' });
    }

    // In production, send password reset email here
    res.json({ message: 'Password reset link has been sent to your email' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const [users] = await pool.execute(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user addresses
    const [addresses] = await pool.execute(
      'SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC',
      [userId]
    );

    res.json({
      user: userResponseFromRow(users[0]),
      addresses
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
