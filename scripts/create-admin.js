const bcrypt = require('bcryptjs');
const pool = require('../config/database');

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

async function main() {
  const fullName = process.env.ADMIN_NAME || 'QuickCart Admin';
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD before running this script.');
  }

  await ensureAdminColumn();

  const hashedPassword = await bcrypt.hash(password, 10);
  const [existing] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);

  if (existing.length > 0) {
    await pool.execute(
      'UPDATE users SET full_name = ?, password = ?, is_admin = TRUE, updated_at = NOW() WHERE email = ?',
      [fullName, hashedPassword, email]
    );
    console.log(`Updated admin user: ${email}`);
    return;
  }

  await pool.execute(
    'INSERT INTO users (full_name, email, password, is_admin) VALUES (?, ?, ?, TRUE)',
    [fullName, email, hashedPassword]
  );
  console.log(`Created admin user: ${email}`);
}

main()
  .catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());

