const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const pool = require('../config/database');

// Get user's cart
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Optimize: Don't select full image_data for cart list
    const [cartItems] = await pool.execute(
      `SELECT c.id, c.user_id, c.product_id, c.quantity, c.created_at,
       p.name, p.price, p.image_url, p.stock_quantity,
       CASE WHEN p.image_data IS NOT NULL THEN 1 ELSE 0 END as has_image
       FROM cart c 
       JOIN products p ON c.product_id = p.id 
       WHERE c.user_id = ? 
       ORDER BY c.created_at DESC`,
      [userId]
    );

    // Convert to response format - include image URL if available
    const cartItemsWithImages = cartItems.map(item => {
      const result = {
        id: item.id,
        user_id: item.user_id,
        product_id: item.product_id,
        quantity: item.quantity,
        name: item.name,
        price: item.price.toString(),
        stock_quantity: item.stock_quantity,
        created_at: item.created_at
      };
      
      // Include image URL if available
      if (item.image_url) {
        result.image_url = item.image_url;
      } else if (item.has_image) {
        // If image_data exists, construct data URL endpoint
        result.image_url = `/api/products/${item.product_id}/image`;
      }
      
      return result;
    });

    // Calculate subtotal
    const subtotal = cartItemsWithImages.reduce((sum, item) => {
      return sum + (parseFloat(item.price) * item.quantity);
    }, 0);

    res.json({
      cartItems: cartItemsWithImages,
      subtotal: subtotal.toFixed(2)
    });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add item to cart
router.post('/add', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { product_id, quantity } = req.body;

    if (!product_id || !quantity) {
      return res.status(400).json({ error: 'Product ID and quantity are required' });
    }

    // Check if product exists
    const [products] = await pool.execute('SELECT id, stock_quantity FROM products WHERE id = ?', [product_id]);
    if (products.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (products[0].stock_quantity < quantity) {
      return res.status(400).json({ error: 'Insufficient stock' });
    }

    // Check if item already in cart
    const [existingItems] = await pool.execute(
      'SELECT id, quantity FROM cart WHERE user_id = ? AND product_id = ?',
      [userId, product_id]
    );

    if (existingItems.length > 0) {
      // Update quantity
      const newQuantity = existingItems[0].quantity + quantity;
      await pool.execute(
        'UPDATE cart SET quantity = ? WHERE id = ?',
        [newQuantity, existingItems[0].id]
      );
      res.json({ message: 'Cart updated successfully' });
    } else {
      // Add new item
      await pool.execute(
        'INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?)',
        [userId, product_id, quantity]
      );
      res.json({ message: 'Item added to cart successfully' });
    }
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update cart item quantity
router.put('/update/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const cartItemId = req.params.id;
    const { quantity } = req.body;

    if (!quantity || quantity < 1) {
      return res.status(400).json({ error: 'Valid quantity is required' });
    }

    // Verify cart item belongs to user
    const [cartItems] = await pool.execute(
      'SELECT * FROM cart WHERE id = ? AND user_id = ?',
      [cartItemId, userId]
    );

    if (cartItems.length === 0) {
      return res.status(404).json({ error: 'Cart item not found' });
    }

    // Check stock
    const [products] = await pool.execute(
      'SELECT stock_quantity FROM products WHERE id = ?',
      [cartItems[0].product_id]
    );

    if (products[0].stock_quantity < quantity) {
      return res.status(400).json({ error: 'Insufficient stock' });
    }

    await pool.execute(
      'UPDATE cart SET quantity = ? WHERE id = ?',
      [quantity, cartItemId]
    );

    res.json({ message: 'Cart updated successfully' });
  } catch (error) {
    console.error('Update cart error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove item from cart
router.delete('/remove/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const cartItemId = req.params.id;

    const [result] = await pool.execute(
      'DELETE FROM cart WHERE id = ? AND user_id = ?',
      [cartItemId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Cart item not found' });
    }

    res.json({ message: 'Item removed from cart successfully' });
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

