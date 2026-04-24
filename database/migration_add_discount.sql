-- Add per-product sale discount (1–100 percent off the list price). Run once on existing DBs.
-- Example: mysql -h ... -u ... -p quickcart < database/migration_add_discount.sql

ALTER TABLE products
  ADD COLUMN discount_percent DECIMAL(5, 2) NULL DEFAULT NULL
  COMMENT '1–100 = percent off list price; NULL/0 = no sale'
  AFTER price;
