-- Update schema to support base64 image blobs
-- Run this to add image_data columns to your existing database

USE quickcart;

-- Add image_data column to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS image_data LONGTEXT AFTER image_url;

-- Add image_data column to categories table
ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS image_data LONGTEXT AFTER image_url;

-- Note: 
-- 1. image_data will store base64 encoded image strings
-- 2. image_url can still be used for backward compatibility
-- 3. The backend will prioritize image_data over image_url when returning data
-- 4. To populate image_data, use:
--    - API endpoints: POST /api/admin/products/:id/image or /api/admin/categories/:id/image
--    - Direct script: node upload_image_to_db.js product 1 ./image.jpg
--    - Batch script: node batch_upload_images.js product ./images
