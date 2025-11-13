const express = require('express');
const router = express.Router();
const multer = require('multer');
const pool = require('../config/database');

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

// Simple upload route - no authentication required (for local/database use)
router.post('/:type/:id', upload.single('image'), async (req, res) => {
  try {
    const { type, id } = req.params;
    
    if (type !== 'product' && type !== 'category') {
      return res.status(400).json({ error: 'Type must be "product" or "category"' });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const tableName = type === 'product' ? 'products' : 'categories';
    
    // Check if record exists
    const [records] = await pool.execute(
      `SELECT id, name FROM ${tableName} WHERE id = ?`,
      [id]
    );

    if (records.length === 0) {
      return res.status(404).json({ error: `${type} with ID ${id} not found` });
    }

    // Convert buffer to base64
    const base64String = req.file.buffer.toString('base64');

    // Update database
    await pool.execute(
      `UPDATE ${tableName} SET image_data = ? WHERE id = ?`,
      [base64String, id]
    );

    res.json({ 
      success: true,
      message: `Image uploaded successfully to ${type} ID ${id} (${records[0].name})`,
      type,
      id,
      name: records[0].name,
      imageSize: req.file.size,
      base64Length: base64String.length
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
});

module.exports = router;

