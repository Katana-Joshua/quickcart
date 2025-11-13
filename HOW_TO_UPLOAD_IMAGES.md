# How to Upload Images - Step by Step

## Step 1: Update Database (One-time setup)

First, add the `image_data` column to your database:

```bash
mysql -u root -p quickcart < database/update_schema_for_blobs.sql
```

Or if you prefer to run SQL directly:
```sql
USE quickcart;
ALTER TABLE products ADD COLUMN image_data LONGTEXT AFTER image_url;
ALTER TABLE categories ADD COLUMN image_data LONGTEXT AFTER image_url;
```

## Step 2: Prepare Your Images

1. **Find your image files** (JPG, PNG, GIF, or WebP)
2. **Note the product/category IDs** you want to upload to
3. **Place images in a folder** (optional, but recommended)

Example folder structure:
```
backend/
  images/
    product1.jpg
    product2.jpg
    category1.png
```

## Step 3: Upload Images

### Method A: Upload Single Image (Easiest)

**For a Product:**
```bash
cd backend
node database/upload_image_to_db.js product 1 ./images/product1.jpg
```

**For a Category:**
```bash
node database/upload_image_to_db.js category 1 ./images/category1.png
```

**What you need:**
- `product` or `category` - the type
- `1` - the ID of the product/category in your database
- `./images/product1.jpg` - path to your image file

**Example with full path:**
```bash
node database/upload_image_to_db.js product 1 C:\Users\admin\Desktop\my_image.jpg
```

### Method B: Upload Multiple Images at Once

If you have a folder with multiple images:

```bash
# Upload all images from a folder
node database/batch_upload_images.js product ./images
```

The script will try to extract IDs from filenames (e.g., `product_1.jpg` → ID 1)

**Or use a mapping file** (`mapping.json`):
```json
{
  "product1.jpg": 1,
  "product2.jpg": 2,
  "product3.jpg": 3
}
```

Then run:
```bash
node database/batch_upload_images.js product ./images mapping.json
```

### Method C: Upload via API (Requires Authentication)

1. **Get your JWT token** by logging in:
   ```bash
   curl -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"your@email.com","password":"yourpassword"}'
   ```

2. **Upload image** using the token:
   ```bash
   curl -X POST http://localhost:3000/api/admin/products/1/image \
     -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
     -F "image=@./images/product1.jpg"
   ```

## Step 4: Verify Upload

Check if the image was uploaded:

```bash
# Test the API
curl http://localhost:3000/api/products/1
```

You should see `image_url` with a `data:image/jpeg;base64,...` format.

## Real-World Example

Let's say you have:
- Product ID 1: "iPhone 15"
- Product ID 2: "Samsung Galaxy"
- Image files: `iphone.jpg` and `samsung.jpg`

**Upload them:**
```bash
cd backend
node database/upload_image_to_db.js product 1 ./iphone.jpg
node database/upload_image_to_db.js product 2 ./samsung.jpg
```

**That's it!** The images are now stored in your database as base64 blobs.

## Troubleshooting

**Error: "Product with ID X not found"**
- Check that the product/category exists in your database
- Verify the ID is correct

**Error: "Image file not found"**
- Check the file path is correct
- Use absolute path if relative path doesn't work

**Error: "Database connection failed"**
- Make sure your `.env` file has correct database credentials
- Ensure MySQL is running

## Quick Reference

```bash
# Single product image
node database/upload_image_to_db.js product <ID> <image_path>

# Single category image
node database/upload_image_to_db.js category <ID> <image_path>

# Batch upload
node database/batch_upload_images.js product <folder_path>

# Convert to base64 (for SQL use)
node database/convert_image_to_base64.js <image_path>
```

