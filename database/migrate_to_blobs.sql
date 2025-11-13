-- Migration script to convert image_url to image_data (base64 blob)
-- Run this after updating your schema

USE quickcart;

-- Add new column for image data (base64 encoded)
ALTER TABLE products ADD COLUMN image_data LONGTEXT AFTER image_url;
ALTER TABLE categories ADD COLUMN image_data LONGTEXT AFTER image_url;

-- Note: You'll need to populate image_data with base64 encoded images
-- The image_url column can be kept for backward compatibility or removed later

