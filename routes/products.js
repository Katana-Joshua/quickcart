const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Get all products with optional filters
router.get('/', async (req, res) => {
  try {
    const { category_id, search, sort_by, featured, limit = 100, offset = 0 } = req.query;
    
    // Build query - include image_data but we'll optimize the response
    // For list views, we'll provide endpoint reference instead of full data
    let query = `SELECT 
      p.id, p.name, p.description, p.price, p.category_id, 
      p.image_url, p.image_data, p.stock_quantity, p.rating, p.review_count, 
      p.is_featured, p.created_at, p.updated_at,
      c.name as category_name
    FROM products p 
    LEFT JOIN categories c ON p.category_id = c.id 
    WHERE 1=1`;
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

    // Add pagination
    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [products] = await pool.execute(query, params);

    // Optimize response - for list views, don't send full base64 image_data
    // Instead, provide data URL only if image_data exists and no image_url
    const productsOptimized = products.map(product => {
      const result = {
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price.toString(),
        category_id: product.category_id,
        category_name: product.category_name,
        stock_quantity: product.stock_quantity,
        rating: product.rating ? product.rating.toString() : '0.00',
        review_count: product.review_count || 0,
        is_featured: product.is_featured ? 1 : 0,
        created_at: product.created_at,
        updated_at: product.updated_at,
      };

      // Handle images - prefer image_url, use image_data only if no URL exists
      // For list views, we still need to provide images, but we'll limit the size
      if (product.image_url) {
        result.image_url = product.image_url;
      } else if (product.image_data) {
        // Only include image_data if it's reasonably small (less than 100KB base64)
        // Otherwise provide endpoint reference
        if (product.image_data.length < 100000) {
          result.image_url = `data:image/jpeg;base64,${product.image_data}`;
        } else {
          // For large images, provide endpoint
          result.image_url = `/api/products/${product.id}/image`;
        }
      }

      return result;
    });

    res.json({ products: productsOptimized });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Get product image by ID (must come before /:id route)
router.get('/:id/image', async (req, res) => {
  try {
    const productId = req.params.id;
    const [products] = await pool.execute(
      'SELECT image_data, image_url FROM products WHERE id = ?',
      [productId]
    );

    if (products.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const product = products[0];
    if (product.image_data) {
      res.json({
        image_url: `data:image/jpeg;base64,${product.image_data}`,
        has_image: true
      });
    } else if (product.image_url) {
      res.json({
        image_url: product.image_url,
        has_image: false
      });
    } else {
      res.status(404).json({ error: 'Product image not found' });
    }
  } catch (error) {
    console.error('Get product image error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Get product by ID (detail view - includes full image data)
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
    
    // For detail view, include full image data
    const productResponse = {
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      category_id: product.category_id,
      category_name: product.category_name,
      stock_quantity: product.stock_quantity,
      rating: product.rating ? product.rating.toString() : '0.00',
      review_count: product.review_count || 0,
      is_featured: product.is_featured ? 1 : 0,
      created_at: product.created_at,
      updated_at: product.updated_at,
    };

    // Convert image_data to base64 data URL if available
    if (product.image_data) {
      productResponse.image_url = `data:image/jpeg;base64,${product.image_data}`;
      productResponse.image_data = product.image_data; // Include for detail view
    } else if (product.image_url) {
      productResponse.image_url = product.image_url;
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
      product: productResponse,
      reviews
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Get all categories
router.get('/categories/all', async (req, res) => {
  try {
    // Don't select image_data - too large for list view
    const [categories] = await pool.execute(
      `SELECT id, name, description, image_url, 
       CASE WHEN image_data IS NOT NULL THEN 1 ELSE 0 END as has_image,
       created_at 
       FROM categories 
       ORDER BY name`
    );

    // Return optimized categories without full image data
    const categoriesOptimized = categories.map(category => ({
      id: category.id,
      name: category.name,
      description: category.description,
      image_url: category.image_url || null,
      has_image: category.has_image || 0,
      created_at: category.created_at
    }));

    res.json({ categories: categoriesOptimized });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

module.exports = router;

