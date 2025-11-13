const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

/**
 * Batch upload images from a directory to products/categories
 * Usage: node batch_upload_images.js <type> <directory_path> [mapping_file]
 * 
 * mapping_file (optional): JSON file mapping image filenames to IDs
 * Example mapping.json:
 * {
 *   "product1.jpg": 1,
 *   "product2.jpg": 2,
 *   "category1.png": 1
 * }
 */

async function batchUploadImages() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('Usage: node batch_upload_images.js <type> <directory_path> [mapping_file]');
    console.log('  type: "product" or "category"');
    console.log('  directory_path: Directory containing image files');
    console.log('  mapping_file (optional): JSON file mapping filenames to IDs');
    console.log('\nExample:');
    console.log('  node batch_upload_images.js product ./images');
    console.log('  node batch_upload_images.js category ./category_images mapping.json');
    process.exit(1);
  }

  const [type, directoryPath, mappingFile] = args;

  if (type !== 'product' && type !== 'category') {
    console.error('Type must be "product" or "category"');
    process.exit(1);
  }

  if (!fs.existsSync(directoryPath)) {
    console.error(`Directory not found: ${directoryPath}`);
    process.exit(1);
  }

  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'quickcart',
    });

    console.log('Connected to database');

    // Load mapping if provided
    let mapping = {};
    if (mappingFile && fs.existsSync(mappingFile)) {
      mapping = JSON.parse(fs.readFileSync(mappingFile, 'utf8'));
      console.log(`Loaded mapping from ${mappingFile}`);
    }

    // Get all image files
    const files = fs.readdirSync(directoryPath).filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
    });

    console.log(`Found ${files.length} image files`);

    const tableName = type === 'product' ? 'products' : 'categories';

    for (const file of files) {
      try {
        const filePath = path.join(directoryPath, file);
        const imageBuffer = fs.readFileSync(filePath);
        const base64String = imageBuffer.toString('base64');

        // Determine ID: use mapping if available, otherwise try to extract from filename
        let id;
        if (mapping[file]) {
          id = mapping[file];
        } else {
          // Try to extract ID from filename (e.g., "product_1.jpg" -> 1)
          const match = file.match(/(\d+)/);
          if (match) {
            id = parseInt(match[1]);
          } else {
            console.log(`⚠ Skipping ${file}: Could not determine ID`);
            continue;
          }
        }

        // Check if record exists
        const [records] = await connection.execute(
          `SELECT id, name FROM ${tableName} WHERE id = ?`,
          [id]
        );

        if (records.length === 0) {
          console.log(`⚠ Skipping ${file}: ${type} ID ${id} not found`);
          continue;
        }

        // Update image_data
        await connection.execute(
          `UPDATE ${tableName} SET image_data = ? WHERE id = ?`,
          [base64String, id]
        );

        console.log(`✓ Uploaded ${file} -> ${type} ID ${id} (${records[0].name})`);
      } catch (error) {
        console.error(`✗ Error processing ${file}:`, error.message);
      }
    }

    await connection.end();
    console.log('\nBatch upload completed!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

batchUploadImages();

