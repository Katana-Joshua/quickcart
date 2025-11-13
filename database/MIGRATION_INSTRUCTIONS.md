# How to Run the Migration

The automated migration script is having database access issues. Here are alternative ways to run the migration:

## Option 1: Run SQL Directly (Easiest)

### Using MySQL Command Line:
```bash
mysql -u root -p quickcart < database/RUN_THIS_SQL.sql
```

### Using phpMyAdmin:
1. Open phpMyAdmin
2. Select the `quickcart` database
3. Click on "SQL" tab
4. Copy and paste the contents of `RUN_THIS_SQL.sql`
5. Click "Go"

### Using MySQL Workbench:
1. Connect to your database
2. Open a new SQL tab
3. Copy and paste the contents of `RUN_THIS_SQL.sql`
4. Execute the query

## Option 2: Manual SQL

Just run these two SQL statements:

```sql
USE quickcart;

ALTER TABLE products ADD COLUMN image_data LONGTEXT AFTER image_url;
ALTER TABLE categories ADD COLUMN image_data LONGTEXT AFTER image_url;
```

## Option 3: Fix .env and Run Script

If you want to use the automated script, make sure your `.env` file has the correct database credentials:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=quickcart
```

Then run:
```bash
node database/run_migration.js
```

## Verify Migration

After running the migration, verify it worked:

```sql
SHOW COLUMNS FROM products LIKE 'image_data';
SHOW COLUMNS FROM categories LIKE 'image_data';
```

You should see the `image_data` column with type `longtext`.

