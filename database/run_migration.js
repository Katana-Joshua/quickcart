const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

/**
 * Run the migration to add image_data columns
 */

async function runMigration() {
  try {
    console.log('Connecting to database...');
    
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'quickcart',
    });

    console.log('✓ Connected to database');
    console.log('Running migration...\n');

    // Use the database first
    await connection.execute('USE quickcart');

    // Check if columns exist first, then add them
    const [productCols] = await connection.execute("SHOW COLUMNS FROM products LIKE 'image_data'");
    const [categoryCols] = await connection.execute("SHOW COLUMNS FROM categories LIKE 'image_data'");

    if (productCols.length === 0) {
      await connection.execute('ALTER TABLE products ADD COLUMN image_data LONGTEXT AFTER image_url');
      console.log('✓ Added image_data column to products table');
    } else {
      console.log('⚠ image_data column already exists in products table');
    }

    if (categoryCols.length === 0) {
      await connection.execute('ALTER TABLE categories ADD COLUMN image_data LONGTEXT AFTER image_url');
      console.log('✓ Added image_data column to categories table');
    } else {
      console.log('⚠ image_data column already exists in categories table');
    }

    // Verify the columns were added
    console.log('\nVerifying migration...');
    
    const [productColumns] = await connection.execute(
      "SHOW COLUMNS FROM products LIKE 'image_data'"
    );
    
    const [categoryColumns] = await connection.execute(
      "SHOW COLUMNS FROM categories LIKE 'image_data'"
    );

    if (productColumns.length > 0) {
      console.log('✓ Verified: image_data column exists in products table');
      console.log(`  Type: ${productColumns[0].Type}`);
    } else {
      console.log('✗ ERROR: image_data column NOT found in products table');
    }

    if (categoryColumns.length > 0) {
      console.log('✓ Verified: image_data column exists in categories table');
      console.log(`  Type: ${categoryColumns[0].Type}`);
    } else {
      console.log('✗ ERROR: image_data column NOT found in categories table');
    }

    await connection.end();
    console.log('\n✓ Migration completed successfully!');
    console.log('You can now upload images to the database.');
    
  } catch (error) {
    console.error('\n✗ Migration failed:');
    console.error(error.message);
    
    // Try alternative approach if IF NOT EXISTS doesn't work
    if (error.message.includes('IF NOT EXISTS')) {
      console.log('\nTrying alternative approach...');
      try {
        const connection = await mysql.createConnection({
          host: process.env.DB_HOST || 'localhost',
          user: process.env.DB_USER || 'root',
          password: process.env.DB_PASSWORD || '',
          database: process.env.DB_NAME || 'quickcart',
        });

        // Check if columns exist first
        const [productCols] = await connection.execute("SHOW COLUMNS FROM products LIKE 'image_data'");
        const [categoryCols] = await connection.execute("SHOW COLUMNS FROM categories LIKE 'image_data'");

        if (productCols.length === 0) {
          await connection.execute('ALTER TABLE products ADD COLUMN image_data LONGTEXT AFTER image_url');
          console.log('✓ Added image_data to products table');
        } else {
          console.log('⚠ image_data already exists in products table');
        }

        if (categoryCols.length === 0) {
          await connection.execute('ALTER TABLE categories ADD COLUMN image_data LONGTEXT AFTER image_url');
          console.log('✓ Added image_data to categories table');
        } else {
          console.log('⚠ image_data already exists in categories table');
        }

        await connection.end();
        console.log('\n✓ Migration completed!');
      } catch (err2) {
        console.error('Alternative approach also failed:', err2.message);
        process.exit(1);
      }
    } else {
      process.exit(1);
    }
  }
}

runMigration();

