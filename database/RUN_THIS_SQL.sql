-- Copy and paste this SQL into your MySQL client (phpMyAdmin, MySQL Workbench, or command line)
-- This will add the image_data columns to your database

USE quickcart;

-- Add image_data column to products table (if it doesn't exist)
ALTER TABLE products 
ADD COLUMN image_data LONGTEXT AFTER image_url;

-- Add image_data column to categories table (if it doesn't exist)
ALTER TABLE categories 
ADD COLUMN image_data LONGTEXT AFTER image_url;

-- Verify the columns were added
SHOW COLUMNS FROM products LIKE 'image_data';
SHOW COLUMNS FROM categories LIKE 'image_data';

