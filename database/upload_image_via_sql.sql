-- SQL Script to Upload Images Directly to Database
-- This shows how to manually insert base64 image data into the database

USE quickcart;

-- Example: Update product image with base64 data
-- Replace 'YOUR_BASE64_STRING_HERE' with actual base64 encoded image
-- Replace 1 with the actual product ID

-- For Products:
-- UPDATE products 
-- SET image_data = 'YOUR_BASE64_STRING_HERE' 
-- WHERE id = 1;

-- For Categories:
-- UPDATE categories 
-- SET image_data = 'YOUR_BASE64_STRING_HERE' 
-- WHERE id = 1;

-- To get base64 from an image file, you can use:
-- 1. Online tools: https://www.base64-image.de/
-- 2. Node.js script: node database/upload_image_to_db.js
-- 3. Python: 
--    import base64
--    with open('image.jpg', 'rb') as f:
--        print(base64.b64encode(f.read()).decode())

-- Example with a small placeholder (1x1 pixel red PNG):
-- UPDATE products 
-- SET image_data = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==' 
-- WHERE id = 1;

