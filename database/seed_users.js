const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function seedUsers() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'quickcart',
  });

  try {
    console.log('Connecting to database...');
    
    // Sample users with plain text passwords (will be hashed)
    const users = [
      {
        full_name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        phone: '123-456-7890'
      },
      {
        full_name: 'Jane Smith',
        email: 'jane@example.com',
        password: 'password123',
        phone: '123-456-7891'
      },
      {
        full_name: 'Bob Johnson',
        email: 'bob@example.com',
        password: 'password123',
        phone: '123-456-7892'
      },
      {
        full_name: 'Alice Williams',
        email: 'alice@example.com',
        password: 'password123',
        phone: '123-456-7893'
      },
      {
        full_name: 'Admin User',
        email: 'admin@quickcart.com',
        password: 'admin123',
        phone: '123-456-0000'
      }
    ];

    console.log('Creating users...');
    
    for (const user of users) {
      // Check if user already exists
      const [existing] = await connection.execute(
        'SELECT id FROM users WHERE email = ?',
        [user.email]
      );

      if (existing.length > 0) {
        console.log(`User ${user.email} already exists, skipping...`);
        continue;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(user.password, 10);

      // Insert user
      await connection.execute(
        'INSERT INTO users (full_name, email, password, phone) VALUES (?, ?, ?, ?)',
        [user.full_name, user.email, hashedPassword, user.phone]
      );

      console.log(`✓ Created user: ${user.email} (Password: ${user.password})`);
    }

    console.log('\n✅ Users created successfully!');
    console.log('\nYou can now login with any of these accounts:');
    users.forEach(user => {
      console.log(`  Email: ${user.email} | Password: ${user.password}`);
    });

  } catch (error) {
    console.error('Error seeding users:', error);
  } finally {
    await connection.end();
  }
}

// Run the seed function
seedUsers();

