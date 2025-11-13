const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

/**
 * Script to upload images directly to database as base64 blobs
 * 
 * This script:
 * 1. Reads an image file from disk
 * 2. Converts it to base64
 * 3. Stores it in the database image_data column
 * 
 * Usage: node upload_image_to_db.js <type> <id> <image_path>
 * 
 * Examples:
 *   node upload_image_to_db.js product 1 ./images/product1.jpg
 *   node upload_image_to_db.js category 2 ./images/category2.png
 * 
 * The image will be automatically converted to base64 and stored as a blob.
 */

async function uploadImageToDatabase() {
  const args = process.argv.slice(2);
  
  if (args.length < 3) {
    console.log('Usage: node upload_image_to_db.js <type> <id> <image_path>');
    console.log('  type: "product" or "category"');
    console.log('  id: The ID of the product or category');
    console.log('  image_path: Path to the image file');
    console.log('\nExample:');
    console.log('  node upload_image_to_db.js product 1 ./images/product1.jpg');
    console.log('  node upload_image_to_db.js category 2 ./images/category2.png');
    process.exit(1);
  }

  const [type, id, imagePath] = args;

  if (type !== 'product' && type !== 'category') {
    console.error('Type must be "product" or "category"');
    process.exit(1);
  }

  // Check if file exists
  if (!fs.existsSync(imagePath)) {
    console.error(`Image file not found: ${imagePath}`);
    process.exit(1);
  }

  try {
    // Read image file and convert to base64
    const imageBuffer = fs.readFileSync(imagePath);
    const base64String = imageBuffer.toString('base64');
    
    console.log(`Image file: ${imagePath}`);
    console.log(`File size: ${(imageBuffer.length / 1024).toFixed(2)} KB`);
    console.log(`Base64 length: ${base64String.length} characters`);

    // Connect to database
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'quickcart',
    });

    console.log('Connected to database');

    // Check if record exists
    const tableName = type === 'product' ? 'products' : 'categories';
    const [records] = await connection.execute(
      `SELECT id, name FROM ${tableName} WHERE id = ?`,
      [id]
    );

    if (records.length === 0) {
      console.error(`${type} with ID ${id} not found`);
      await connection.end();
      process.exit(1);
    }

    console.log(`Found ${type}: ${records[0].name} (ID: ${records[0].id})`);

    // Update image_data
    await connection.execute(
      `UPDATE ${tableName} SET image_data = ? WHERE id = ?`,
      [base64String, id]
    );

    console.log(`✓ Successfully uploaded image to ${type} ID ${id}`);
    console.log(`  Image stored as base64 blob in image_data column`);

    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

uploadImageToDatabase();

