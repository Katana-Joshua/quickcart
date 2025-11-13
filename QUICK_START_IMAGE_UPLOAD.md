# Quick Start: Image Upload to Database

## Step 1: Update Database Schema

Run this SQL to add the `image_data` column:

```bash
mysql -u root -p < database/update_schema_for_blobs.sql
```

Or manually:
```sql
USE quickcart;
ALTER TABLE products ADD COLUMN image_data LONGTEXT AFTER image_url;
ALTER TABLE categories ADD COLUMN image_data LONGTEXT AFTER image_url;
```

## Step 2: Choose Your Upload Method

### Option A: Command Line Script (Easiest)

```bash
# Upload single image
node database/upload_image_to_db.js product 1 ./my_image.jpg

# Upload multiple images from folder
node database/batch_upload_images.js product ./images_folder
```

### Option B: API Endpoint (Requires Authentication)

```bash
# Get your JWT token first by logging in
# Then upload image file:
curl -X POST http://localhost:3000/api/admin/products/1/image \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "image=@./my_image.jpg"
```

### Option C: Direct SQL

```bash
# Convert image to base64
node database/convert_image_to_base64.js ./my_image.jpg base64.txt

# Use in SQL
mysql -u root -p quickcart -e "UPDATE products SET image_data = '$(cat base64.txt)' WHERE id = 1;"
```

## Step 3: Verify Upload

```bash
# Test API endpoint
curl http://localhost:3000/api/products/1

# Should return image_url as data:image/jpeg;base64,...
```

## That's It!

Images are now stored as base64 blobs in the database and automatically converted to data URLs by the API.

