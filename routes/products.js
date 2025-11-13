const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Get all products with optional filters
router.get('/', async (req, res) => {
  try {
    const { category_id, search, sort_by, featured } = req.query;
    let query = 'SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE 1=1';
    const params = [];

    if (category_id) {
      query += ' AND p.category_id = ?';
      params.push(category_id);
    }

    if (search) {
      query += ' AND (p.name LIKE ? OR p.description LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }

    if (featured === 'true') {
      query += ' AND p.is_featured = TRUE';
    }

    // Sorting
    if (sort_by === 'price_low') {
      query += ' ORDER BY p.price ASC';
    } else if (sort_by === 'price_high') {
      query += ' ORDER BY p.price DESC';
    } else if (sort_by === 'rating') {
      query += ' ORDER BY p.rating DESC';
    } else {
      query += ' ORDER BY p.created_at DESC';
    }

    const [products] = await pool.execute(query, params);

    // Convert image_data (base64) to include in response
    const productsWithImages = products.map(product => ({
      ...product,
      image_data: product.image_data || null,
      image_url: product.image_data ? `data:image/jpeg;base64,${product.image_data}` : product.image_url
    }));

    res.json({ products: productsWithImages });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get product by ID
router.get('/:id', async (req, res) => {
  try {
    const productId = req.params.id;

    const [products] = await pool.execute(
      `SELECT p.*, c.name as category_name 
       FROM products p 
       LEFT JOIN categories c ON p.category_id = c.id 
       WHERE p.id = ?`,
      [productId]
    );

    if (products.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const product = products[0];
    // Convert image_data to base64 data URL if available
    if (product.image_data) {
      product.image_url = `data:image/jpeg;base64,${product.image_data}`;
    }

    // Get reviews for the product
    const [reviews] = await pool.execute(
      `SELECT pr.*, u.full_name 
       FROM product_reviews pr 
       JOIN users u ON pr.user_id = u.id 
       WHERE pr.product_id = ? 
       ORDER BY pr.created_at DESC 
       LIMIT 10`,
      [productId]
    );

    res.json({
      product: product,
      reviews
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all categories
router.get('/categories/all', async (req, res) => {
  try {
    const [categories] = await pool.execute('SELECT * FROM categories ORDER BY name');

    // Convert image_data to base64 data URL if available
    const categoriesWithImages = categories.map(category => ({
      ...category,
      image_url: category.image_data ? `data:image/jpeg;base64,${category.image_data}` : category.image_url
    }));

    res.json({ categories: categoriesWithImages });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

