const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const pool = require('../config/database');

// Create order (checkout)
router.post('/checkout', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { shipping_address_id, shipping_method, payment_method } = req.body;

    if (!shipping_address_id || !payment_method) {
      return res.status(400).json({ error: 'Shipping address and payment method are required' });
    }

    // Get cart items
    const [cartItems] = await pool.execute(
      `SELECT c.*, p.price, p.name 
       FROM cart c 
       JOIN products p ON c.product_id = p.id 
       WHERE c.user_id = ?`,
      [userId]
    );

    if (cartItems.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    // Calculate totals
    const subtotal = cartItems.reduce((sum, item) => {
      return sum + (parseFloat(item.price) * item.quantity);
    }, 0);

    const shippingCost = shipping_method === 'Express' ? 15.00 : 5.00;
    const total = subtotal + shippingCost;

    // Generate order number
    const orderNumber = 'QC' + Date.now() + Math.floor(Math.random() * 1000);

    // Calculate estimated delivery (7 days for standard, 3 days for express)
    const deliveryDays = shipping_method === 'Express' ? 3 : 7;
    const estimatedDelivery = new Date();
    estimatedDelivery.setDate(estimatedDelivery.getDate() + deliveryDays);

    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Create order
      const [orderResult] = await connection.execute(
        `INSERT INTO orders (user_id, order_number, shipping_address_id, shipping_method, payment_method, subtotal, shipping_cost, total, estimated_delivery_date) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, orderNumber, shipping_address_id, shipping_method || 'Standard', payment_method, subtotal, shippingCost, total, estimatedDelivery]
      );

      const orderId = orderResult.insertId;

      // Create order items
      for (const item of cartItems) {
        await connection.execute(
          'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
          [orderId, item.product_id, item.quantity, item.price]
        );

        // Update product stock
        await connection.execute(
          'UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?',
          [item.quantity, item.product_id]
        );
      }

      // Clear cart
      await connection.execute('DELETE FROM cart WHERE user_id = ?', [userId]);

      await connection.commit();
      connection.release();

      // Get order details
      const [orders] = await pool.execute(
        `SELECT o.*, a.street_address, a.city, a.state, a.zip_code, a.country 
         FROM orders o 
         JOIN addresses a ON o.shipping_address_id = a.id 
         WHERE o.id = ?`,
        [orderId]
      );

      const [orderItems] = await pool.execute(
        `SELECT oi.*, p.name, p.image_url, p.image_data 
         FROM order_items oi 
         JOIN products p ON oi.product_id = p.id 
         WHERE oi.order_id = ?`,
        [orderId]
      );

      // Convert image_data to base64 data URL if available
      const orderItemsWithImages = orderItems.map(item => ({
        ...item,
        image_url: item.image_data ? `data:image/jpeg;base64,${item.image_data}` : item.image_url
      }));

      res.status(201).json({
        message: 'Order placed successfully',
        order: {
          ...orders[0],
          items: orderItemsWithImages
        }
      });
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's orders
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const [orders] = await pool.execute(
      `SELECT o.*, a.street_address, a.city, a.state, a.zip_code 
       FROM orders o 
       JOIN addresses a ON o.shipping_address_id = a.id 
       WHERE o.user_id = ? 
       ORDER BY o.created_at DESC`,
      [userId]
    );

    res.json({ orders });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get order by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const orderId = req.params.id;

    const [orders] = await pool.execute(
      `SELECT o.*, a.street_address, a.city, a.state, a.zip_code, a.country 
       FROM orders o 
       JOIN addresses a ON o.shipping_address_id = a.id 
       WHERE o.id = ? AND o.user_id = ?`,
      [orderId, userId]
    );

    if (orders.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const [orderItems] = await pool.execute(
      `SELECT oi.*, p.name, p.image_url, p.image_data 
       FROM order_items oi 
       JOIN products p ON oi.product_id = p.id 
       WHERE oi.order_id = ?`,
      [orderId]
    );

    // Convert image_data to base64 data URL if available
    const orderItemsWithImages = orderItems.map(item => ({
      ...item,
      image_url: item.image_data ? `data:image/jpeg;base64,${item.image_data}` : item.image_url
    }));

    res.json({
      order: {
        ...orders[0],
        items: orderItemsWithImages
      }
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add/Update shipping address
router.post('/address', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { street_address, city, state, zip_code, country, is_default } = req.body;

    if (!street_address || !city) {
      return res.status(400).json({ error: 'Street address and city are required' });
    }

    // If this is set as default, unset other defaults
    if (is_default) {
      await pool.execute(
        'UPDATE addresses SET is_default = FALSE WHERE user_id = ?',
        [userId]
      );
    }

    const [result] = await pool.execute(
      `INSERT INTO addresses (user_id, street_address, city, state, zip_code, country, is_default) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, street_address, city, state || null, zip_code || null, country || 'USA', is_default || false]
    );

    res.status(201).json({
      message: 'Address added successfully',
      address_id: result.insertId
    });
  } catch (error) {
    console.error('Add address error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

