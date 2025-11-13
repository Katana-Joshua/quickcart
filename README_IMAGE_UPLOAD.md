# Image Upload Guide - Base64 Blobs

This guide explains how to upload images to the database as base64 blobs.

## Database Setup

First, add the `image_data` column to your database:

```bash
mysql -u root -p < backend/database/update_schema_for_blobs.sql
```

Or run the SQL directly:
```sql
ALTER TABLE products ADD COLUMN image_data LONGTEXT AFTER image_url;
ALTER TABLE categories ADD COLUMN image_data LONGTEXT AFTER image_url;
```

## Method 1: API Upload (Recommended)

### Upload via File (Multipart Form)

**For Products:**
```bash
curl -X POST http://localhost:3000/api/admin/products/1/image \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "image=@/path/to/image.jpg"
```

**For Categories:**
```bash
curl -X POST http://localhost:3000/api/admin/categories/1/image \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "image=@/path/to/image.jpg"
```

### Upload via Base64 String

**For Products:**
```bash
curl -X POST http://localhost:3000/api/admin/products/1/image-base64 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"image_data": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."}'
```

## Method 2: Direct Database Script

### Single Image Upload

```bash
cd backend
node database/upload_image_to_db.js product 1 ./images/product1.jpg
node database/upload_image_to_db.js category 2 ./images/category2.png
```

**Usage:**
```
node upload_image_to_db.js <type> <id> <image_path>
  type: "product" or "category"
  id: The ID of the product/category
  image_path: Path to the image file
```

### Batch Image Upload

```bash
cd backend
node database/batch_upload_images.js product ./images
node database/batch_upload_images.js category ./category_images mapping.json
```

**Optional Mapping File (mapping.json):**
```json
{
  "product1.jpg": 1,
  "product2.jpg": 2,
  "product3.jpg": 3,
  "category1.png": 1,
  "category2.png": 2
}
```

If no mapping file is provided, the script tries to extract IDs from filenames (e.g., "product_1.jpg" -> ID 1).

## Method 3: Direct SQL (Manual)

### Step 1: Convert Image to Base64

**Option A: Using the provided script:**
```bash
cd backend
node database/convert_image_to_base64.js ./images/product1.jpg
node database/convert_image_to_base64.js ./images/product1.jpg base64_output.txt
```

**Option B: Using Node.js directly:**
```javascript
const fs = require('fs');
const imageBuffer = fs.readFileSync('image.jpg');
const base64 = imageBuffer.toString('base64');
console.log(base64);
```

**Option C: Using online tools:**
- https://www.base64-image.de/
- https://base64.guru/converter/encode/image

### Step 2: Insert into Database

```sql
-- For Products
UPDATE products SET image_data = 'YOUR_BASE64_STRING_HERE' WHERE id = 1;

-- For Categories
UPDATE categories SET image_data = 'YOUR_BASE64_STRING_HERE' WHERE id = 1;
```

**Example:**
```sql
USE quickcart;

-- Update product ID 1 with base64 image
UPDATE products 
SET image_data = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==' 
WHERE id = 1;
```

## Supported Image Formats

- JPEG/JPG
- PNG
- GIF
- WebP

**File Size Limit:** 5MB per image (configurable in admin.js)

## How It Works

1. **Upload**: Image is uploaded via API or script
2. **Conversion**: Image file is converted to base64 string
3. **Storage**: Base64 string is stored in `image_data` column (LONGTEXT)
4. **Retrieval**: Backend automatically converts base64 to `data:image/jpeg;base64,{base64}` format
5. **Display**: Flutter app uses `ImageHelper.buildImage()` to display both base64 and URL images

## Testing

After uploading, test the API:
```bash
curl http://localhost:3000/api/products/1
```

The response should include `image_url` with a data URL format if `image_data` exists.

