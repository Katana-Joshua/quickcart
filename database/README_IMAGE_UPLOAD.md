# Image Upload to Database - Quick Guide

## Quick Start

### 1. Update Database Schema
```bash
mysql -u root -p < update_schema_for_blobs.sql
```

### 2. Upload Single Image
```bash
node upload_image_to_db.js product 1 ./my_image.jpg
```

### 3. Upload Multiple Images
```bash
node batch_upload_images.js product ./images_folder
```

## All Methods

### Method 1: Command Line Script (Easiest)
```bash
# Single image
node upload_image_to_db.js product 1 ./image.jpg

# Batch upload
node batch_upload_images.js product ./images
```

### Method 2: API Endpoint
```bash
# File upload
curl -X POST http://localhost:3000/api/admin/products/1/image \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "image=@./image.jpg"

# Base64 upload
curl -X POST http://localhost:3000/api/admin/products/1/image-base64 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"image_data": "data:image/jpeg;base64,..."}'
```

### Method 3: Direct SQL
```bash
# Convert image to base64 first
node convert_image_to_base64.js ./image.jpg base64.txt

# Then use in SQL
mysql -u root -p -e "USE quickcart; UPDATE products SET image_data = '$(cat base64.txt)' WHERE id = 1;"
```

## Notes

- Images are stored as base64 strings in `image_data` column (LONGTEXT)
- Maximum file size: 5MB (configurable)
- Supported formats: JPEG, PNG, GIF, WebP
- The backend automatically converts base64 to data URLs for the API
- Flutter app handles both base64 data URLs and regular URLs automatically

