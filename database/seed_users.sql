-- Sample Users SQL (Note: Passwords are hashed using bcrypt)
-- Use seed_users.js script instead for proper password hashing
-- Or manually create users through the signup API endpoint

-- Example: To create a user manually, use the signup endpoint:
-- POST http://localhost:3000/api/auth/signup
-- {
--   "full_name": "John Doe",
--   "email": "john@example.com",
--   "password": "password123"
-- }

-- If you want to insert directly (NOT RECOMMENDED - passwords won't be hashed):
-- You would need to hash passwords first using bcrypt
-- Default password hash for "password123" (bcrypt, 10 rounds): $2a$10$...

-- Better approach: Run the Node.js script:
-- node database/seed_users.js

