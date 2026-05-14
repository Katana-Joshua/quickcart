const bcrypt = require('bcryptjs');
const pool = require('../config/database');

const adminUser = {
  fullName: 'QuickCart Admin',
  email: 'admin@quickcart.com',
  password: 'Admin@123456',
};

async function ensureAdminColumn() {
  const dbName = process.env.DB_NAME || 'quickcart';
  const [columns] = await pool.execute(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'is_admin'`,
    [dbName]
  );

  if (columns.length === 0) {
    await pool.execute(
      'ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE AFTER phone'
    );
    console.log('Added users.is_admin column');
  }
}

async function seedAdminUser() {
  await ensureAdminColumn();

  const hashedPassword = await bcrypt.hash(adminUser.password, 10);
  const [existingUsers] = await pool.execute(
    'SELECT id FROM users WHERE email = ?',
    [adminUser.email]
  );

  if (existingUsers.length > 0) {
    await pool.execute(
      `UPDATE users
       SET full_name = ?, password = ?, is_admin = TRUE, updated_at = NOW()
       WHERE email = ?`,
      [adminUser.fullName, hashedPassword, adminUser.email]
    );
    console.log(`Updated admin user in MySQL: ${adminUser.email}`);
    return;
  }

  await pool.execute(
    `INSERT INTO users (full_name, email, password, is_admin)
     VALUES (?, ?, ?, TRUE)`,
    [adminUser.fullName, adminUser.email, hashedPassword]
  );
  console.log(`Created admin user in MySQL: ${adminUser.email}`);
}

seedAdminUser()
  .catch(error => {
    console.error('Failed to seed admin user:', error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());

