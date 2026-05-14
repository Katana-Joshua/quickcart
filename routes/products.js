const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { applyDiscountToProductResult } = require('../lib/pricing');

function toPositiveInt(value, fallback, max) {
  const n = parseInt(String(value), 10);
  if (Number.isNaN(n) || n < 0) return fallback;
  return Math.min(n, max);
}

function mapProductListItem(req, product) {
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

  if (product.image_url) {
    result.image_url = product.image_url;
  } else if (product.has_image_data) {
    result.image_url = `/api/products/${product.id}/image`;
  }

  return applyDiscountToProductResult(result, product);
}

function productListSelect() {
  return `SELECT 
    p.id, p.name, p.description, p.price, p.discount_percent, p.category_id, 
    p.image_url, CASE WHEN p.image_data IS NOT NULL THEN 1 ELSE 0 END as has_image_data,
    p.stock_quantity, p.rating, p.review_count, p.is_featured, p.created_at, p.updated_at,
    c.name as category_name
  FROM products p 
  LEFT JOIN categories c ON p.category_id = c.id`;
}

async function getProductList(req, {
  category_id,
  search,
  sort_by,
  featured,
  discounted,
  limit = 100,
  offset = 0,
} = {}) {
  let query = `${productListSelect()} WHERE 1=1`;
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

  if (featured === 'true' || featured === true) {
    query += ' AND p.is_featured = TRUE';
  }

  if (discounted === 'true' || discounted === true) {
    query += ' AND p.discount_percent IS NOT NULL AND p.discount_percent > 0 AND p.discount_percent <= 100';
  }

  const effExpr = '(p.price * (100 - IFNULL(p.discount_percent, 0)) / 100)';
  if (sort_by === 'price_low') {
    query += ` ORDER BY ${effExpr} ASC`;
  } else if (sort_by === 'price_high') {
    query += ` ORDER BY ${effExpr} DESC`;
  } else if (sort_by === 'rating') {
    query += ' ORDER BY p.rating DESC';
  } else {
    query += ' ORDER BY p.created_at DESC';
  }

  query += ' LIMIT ? OFFSET ?';
  params.push(toPositiveInt(limit, 100, 100), toPositiveInt(offset, 0, 100000));

  const [products] = await pool.execute(query, params);
  return products.map(product => mapProductListItem(req, product));
}

// Get all products with optional filters
router.get('/', async (req, res) => {
  try {
    const products = await getProductList(req, req.query);
    res.json({ products });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

function absolutePublicUrl(req, pathOrUrl) {
  if (!pathOrUrl) return null;
  const s = String(pathOrUrl).trim();
  if (/^https?:\/\//i.test(s)) return s;
  const proto = (req.get('x-forwarded-proto') || req.protocol || 'https').split(':')[0];
  if (s.startsWith('//')) {
    return `${proto}:${s}`;
  }
  const host = req.get('x-forwarded-host') || req.get('host');
  if (!host) return s.startsWith('/') ? s : `/${s}`;
  if (s.startsWith('/')) return `${proto}://${host}${s}`;
  return `${proto}://${host}/${s}`;
}

// Home bootstrap data for the mobile app. This avoids several startup round trips.
router.get('/home', async (req, res) => {
  try {
    const [categories] = await pool.execute(
      `SELECT id, name, description, image_url, 
       CASE WHEN image_data IS NOT NULL THEN 1 ELSE 0 END as has_image,
       created_at 
       FROM categories 
       ORDER BY name`
    );

    const [featuredProducts, recommendedProducts, saleProducts] = await Promise.all([
      getProductList(req, { featured: true, limit: 24 }),
      getProductList(req, { limit: 10 }),
      getProductList(req, { discounted: true, limit: 8 }),
    ]);

    res.setHeader('Cache-Control', 'private, max-age=30');
    res.json({
      categories: categories.map(category => ({
        id: category.id,
        name: category.name,
        description: category.description,
        image_url: category.image_url || null,
        has_image: category.has_image || 0,
        created_at: category.created_at
      })),
      featured_products: featuredProducts,
      recommended_products: recommendedProducts,
      sale_products: saleProducts,
    });
  } catch (error) {
    console.error('Get home data error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Get product image by ID (must come before /:id route)
// Returns real image bytes or redirects so mobile/web image widgets can load this URL directly.
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
      try {
        const buf = Buffer.from(String(product.image_data).replace(/\s/g, ''), 'base64');
        if (!buf.length) {
          return res.status(404).json({ error: 'Invalid image data' });
        }
        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.status(200).send(buf);
      } catch (e) {
        return res.status(404).json({ error: 'Invalid image data' });
      }
    }
    if (product.image_url) {
      const target = absolutePublicUrl(req, product.image_url);
      return res.redirect(302, target);
    }
    return res.status(404).json({ error: 'Product image not found' });
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
    const productResponse = applyDiscountToProductResult(
      {
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
      },
      product
    );

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

