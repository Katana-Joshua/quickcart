# QuickCart Backend API

## Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment**
   - Copy `.env.example` to `.env`
   - Update the database credentials and JWT secret

3. **Setup MySQL Database**
   - Make sure MySQL is installed and running
   - Run the SQL script to create the database and tables:
   ```bash
   mysql -u root -p < database/schema.sql
   ```

4. **Start the Server**
   ```bash
   npm start
   # or for development with auto-reload:
   npm run dev
   ```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create new user account
- `POST /api/auth/login` - Login user
- `POST /api/auth/forgot-password` - Request password reset
- `GET /api/auth/profile` - Get user profile (requires auth)

### Products
- `GET /api/products` - Get all products (supports query params: category_id, search, sort_by, featured)
- `GET /api/products/:id` - Get product details
- `GET /api/products/categories/all` - Get all categories

### Cart
- `GET /api/cart` - Get user's cart (requires auth)
- `POST /api/cart/add` - Add item to cart (requires auth)
- `PUT /api/cart/update/:id` - Update cart item quantity (requires auth)
- `DELETE /api/cart/remove/:id` - Remove item from cart (requires auth)

### Orders
- `POST /api/orders/checkout` - Create order (requires auth)
- `GET /api/orders` - Get user's orders (requires auth)
- `GET /api/orders/:id` - Get order details (requires auth)
- `POST /api/orders/address` - Add shipping address (requires auth)

## Authentication

Most endpoints require authentication. Include the JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

