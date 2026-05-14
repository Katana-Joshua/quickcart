const express = require('express');
const router = express.Router();
const multer = require('multer');
const pool = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Configure multer for memory storage (we'll convert to base64)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only images
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Upload product image (file upload)
router.post('/products/:id/image', authenticateToken, requireAdmin, upload.single('image'), async (req, res) => {
  try {
    const productId = req.params.id;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // Convert buffer to base64
    const base64String = req.file.buffer.toString('base64');

    await pool.execute(
      'UPDATE products SET image_data = ? WHERE id = ?',
      [base64String, productId]
    );

    res.json({ 
      message: 'Product image uploaded and stored as blob successfully',
      product_id: productId
    });
  } catch (error) {
    console.error('Error uploading product image:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload product image (base64 string)
router.post('/products/:id/image-base64', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const productId = req.params.id;
    const { image_data } = req.body; // Base64 encoded image string

    if (!image_data) {
      return res.status(400).json({ error: 'Image data is required' });
    }

    // Remove data URL prefix if present (data:image/jpeg;base64,...)
    let base64String = image_data;
    if (image_data.includes(',')) {
      base64String = image_data.split(',')[1];
    }

    await pool.execute(
      'UPDATE products SET image_data = ? WHERE id = ?',
      [base64String, productId]
    );

    res.json({ 
      message: 'Product image stored as blob successfully',
      product_id: productId
    });
  } catch (error) {
    console.error('Error updating product image:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload category image (file upload)
router.post('/categories/:id/image', authenticateToken, requireAdmin, upload.single('image'), async (req, res) => {
  try {
    const categoryId = req.params.id;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // Convert buffer to base64
    const base64String = req.file.buffer.toString('base64');

    await pool.execute(
      'UPDATE categories SET image_data = ? WHERE id = ?',
      [base64String, categoryId]
    );

    res.json({ 
      message: 'Category image uploaded and stored as blob successfully',
      category_id: categoryId
    });
  } catch (error) {
    console.error('Error uploading category image:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload category image (base64 string)
router.post('/categories/:id/image-base64', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const categoryId = req.params.id;
    const { image_data } = req.body;

    if (!image_data) {
      return res.status(400).json({ error: 'Image data is required' });
    }

    // Remove data URL prefix if present
    let base64String = image_data;
    if (image_data.includes(',')) {
      base64String = image_data.split(',')[1];
    }

    await pool.execute(
      'UPDATE categories SET image_data = ? WHERE id = ?',
      [base64String, categoryId]
    );

    res.json({ 
      message: 'Category image stored as blob successfully',
      category_id: categoryId
    });
  } catch (error) {
    console.error('Error updating category image:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
