const express = require('express');
const router = express.Router();
const multer = require('multer');
const pool = require('../config/database');

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limits
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// ========== PRODUCTS ==========

// Get all products
router.get('/products', async (req, res) => {
  try {
    const [products] = await pool.execute(
      'SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id ORDER BY p.created_at DESC'
    );
    
    const productsWithImages = products.map(product => ({
      ...product,
      image_url: product.image_data ? `data:image/jpeg;base64,${product.image_data}` : product.image_url
    }));
    
    res.json({ products: productsWithImages });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get product by ID
router.get('/products/:id', async (req, res) => {
  try {
    const [products] = await pool.execute(
      'SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ?',
      [req.params.id]
    );
    
    if (products.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    const product = products[0];
    product.image_url = product.image_data ? `data:image/jpeg;base64,${product.image_data}` : product.image_url;
    
    res.json({ product });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

function toBool(v) {
  if (v === true || v === 1) return true;
  const s = String(v === undefined || v === null ? '' : v).toLowerCase();
  return s === 'true' || s === 'on' || s === '1' || s === 'yes';
}

function toNullableId(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = parseInt(String(v), 10);
  return Number.isNaN(n) ? null : n;
}

// Create product (name, price, fields + optional image in one request, multipart)
router.post('/products', upload.single('image'), async (req, res) => {
  try {
    const { name, description, price, category_id, stock_quantity, is_featured } = req.body;

    if (!name || price === undefined || price === '') {
      return res.status(400).json({ error: 'Name and price are required' });
    }

    const catId = toNullableId(category_id);
    const stock = stock_quantity !== undefined && stock_quantity !== '' ? parseInt(String(stock_quantity), 10) : 0;
    const featured = toBool(is_featured);
    const imageData = req.file ? req.file.buffer.toString('base64') : null;

    const [result] = await pool.execute(
      'INSERT INTO products (name, description, price, category_id, stock_quantity, is_featured, image_data, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, NULL)',
      [name, description || null, price, catId, Number.isNaN(stock) ? 0 : stock, featured, imageData]
    );

    res.json({
      message: 'Product created successfully',
      product_id: result.insertId
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update product (same form; optional new image, or clear image)
router.put('/products/:id', upload.single('image'), async (req, res) => {
  try {
    const { name, description, price, category_id, stock_quantity, is_featured, remove_image } = req.body;
    const id = req.params.id;
    const catId = toNullableId(category_id);
    const stock = stock_quantity !== undefined && stock_quantity !== '' ? parseInt(String(stock_quantity), 10) : 0;
    const featured = toBool(is_featured);
    const clear = remove_image === 'true' || remove_image === true;

    if (req.file) {
      await pool.execute(
        'UPDATE products SET name = ?, description = ?, price = ?, category_id = ?, stock_quantity = ?, is_featured = ?, image_data = ?, image_url = NULL WHERE id = ?',
        [name, description, price, catId, Number.isNaN(stock) ? 0 : stock, featured, req.file.buffer.toString('base64'), id]
      );
    } else if (clear) {
      await pool.execute(
        'UPDATE products SET name = ?, description = ?, price = ?, category_id = ?, stock_quantity = ?, is_featured = ?, image_data = NULL, image_url = NULL WHERE id = ?',
        [name, description, price, catId, Number.isNaN(stock) ? 0 : stock, featured, id]
      );
    } else {
      await pool.execute(
        'UPDATE products SET name = ?, description = ?, price = ?, category_id = ?, stock_quantity = ?, is_featured = ? WHERE id = ?',
        [name, description, price, catId, Number.isNaN(stock) ? 0 : stock, featured, id]
      );
    }

    res.json({ message: 'Product updated successfully' });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete product
router.delete('/products/:id', async (req, res) => {
  try {
    await pool.execute('DELETE FROM products WHERE id = ?', [req.params.id]);
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload product image
router.post('/products/:id/image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }
    
    const base64String = req.file.buffer.toString('base64');
    await pool.execute('UPDATE products SET image_data = ?, image_url = NULL WHERE id = ?', [base64String, req.params.id]);
    
    res.json({ message: 'Product image uploaded successfully' });
  } catch (error) {
    console.error('Upload product image error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========== CATEGORIES ==========

// Get all categories
router.get('/categories', async (req, res) => {
  try {
    const [categories] = await pool.execute('SELECT * FROM categories ORDER BY name');
    
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

// Get category by ID
router.get('/categories/:id', async (req, res) => {
  try {
    const [categories] = await pool.execute('SELECT * FROM categories WHERE id = ?', [req.params.id]);
    
    if (categories.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    const category = categories[0];
    category.image_url = category.image_data ? `data:image/jpeg;base64,${category.image_data}` : category.image_url;
    
    res.json({ category });
  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create category (optional image in one request)
router.post('/categories', upload.single('image'), async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const imageData = req.file ? req.file.buffer.toString('base64') : null;

    const [result] = await pool.execute(
      'INSERT INTO categories (name, description, image_data, image_url) VALUES (?, ?, ?, NULL)',
      [name, description || null, imageData]
    );

    res.json({
      message: 'Category created successfully',
      category_id: result.insertId
    });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update category (optional new image, or clear image)
router.put('/categories/:id', upload.single('image'), async (req, res) => {
  try {
    const { name, description, remove_image } = req.body;
    const id = req.params.id;
    const clear = remove_image === 'true' || remove_image === true;

    if (req.file) {
      await pool.execute(
        'UPDATE categories SET name = ?, description = ?, image_data = ?, image_url = NULL WHERE id = ?',
        [name, description, req.file.buffer.toString('base64'), id]
      );
    } else if (clear) {
      await pool.execute(
        'UPDATE categories SET name = ?, description = ?, image_data = NULL, image_url = NULL WHERE id = ?',
        [name, description, id]
      );
    } else {
      await pool.execute(
        'UPDATE categories SET name = ?, description = ? WHERE id = ?',
        [name, description, id]
      );
    }

    res.json({ message: 'Category updated successfully' });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete category
router.delete('/categories/:id', async (req, res) => {
  try {
    await pool.execute('DELETE FROM categories WHERE id = ?', [req.params.id]);
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload category image
router.post('/categories/:id/image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }
    
    const base64String = req.file.buffer.toString('base64');
    await pool.execute('UPDATE categories SET image_data = ?, image_url = NULL WHERE id = ?', [base64String, req.params.id]);
    
    res.json({ message: 'Category image uploaded successfully' });
  } catch (error) {
    console.error('Upload category image error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========== ORDERS ==========

// Get all orders
router.get('/orders', async (req, res) => {
  try {
    const [orders] = await pool.execute(
      `SELECT o.*, u.full_name, u.email, a.street_address, a.city, a.state, a.zip_code, a.country 
       FROM orders o 
       JOIN users u ON o.user_id = u.id 
       LEFT JOIN addresses a ON o.shipping_address_id = a.id 
       ORDER BY o.created_at DESC`
    );
    
    res.json({ orders });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get order by ID with items
router.get('/orders/:id', async (req, res) => {
  try {
    const [orders] = await pool.execute(
      `SELECT o.*, u.full_name, u.email, a.street_address, a.city, a.state, a.zip_code, a.country 
       FROM orders o 
       JOIN users u ON o.user_id = u.id 
       LEFT JOIN addresses a ON o.shipping_address_id = a.id 
       WHERE o.id = ?`,
      [req.params.id]
    );
    
    if (orders.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    const [orderItems] = await pool.execute(
      `SELECT oi.*, p.name, p.image_url, p.image_data 
       FROM order_items oi 
       JOIN products p ON oi.product_id = p.id 
       WHERE oi.order_id = ?`,
      [req.params.id]
    );
    
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

module.exports = router;

