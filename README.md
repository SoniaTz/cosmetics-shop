# Cosmetics E-Commerce Website

A complete, fully functional, multilingual e-commerce platform for cosmetics built with Node.js, Express, SQLite, Stripe, and vanilla JavaScript.

## Features

✅ **Bilingual Support** - English and Greek languages with localStorage persistence
✅ **Product Management** - Add, edit, delete products with images
✅ **Shopping Cart** - Add/remove items, persistent cart storage
✅ **Coupon System** - Percentage and fixed-amount discounts
✅ **Stripe Payments** - Secure payment processor integration
✅ **Admin Panel** - Full admin dashboard with login
✅ **Product Generator** - AI-powered sample cosmetics generation
✅ **Shipping Methods** - Multiple shipping options with costs
✅ **Newsletter** - Email subscription system
✅ **Orders Management** - View and track orders
✅ **SEO Optimized** - Sitemap, robots.txt, meta tags
✅ **Responsive Design** - Mobile, tablet, and desktop support
✅ **Docker Ready** - Complete containerization

## Tech Stack

### Frontend
- HTML5
- CSS3 (Responsive design)
- Vanilla JavaScript (No frameworks)

### Backend
- Node.js v18+
- Express.js 4.18+
- SQLite3 Database
- Stripe API
- Nodemailer

### Deployment
- Docker
- Docker Compose

## Project Structure

```
cosmetics-shop/
├── public/
│   ├── css/
│   │   └── styles.css              # All styles
│   ├── js/
│   │   ├── i18n.js                 # Language system
│   │   ├── cart.js                 # Cart management
│   │   ├── main.js                 # Home page
│   │   ├── products.js             # Products page
│   │   ├── product-detail.js       # Single product
│   │   ├── shopping-cart.js        # Cart page
│   │   ├── checkout.js             # Checkout with Stripe
│   │   ├── success.js              # Success page
│   │   └── admin.js                # Admin panel
│   ├── lang/
│   │   ├── en.json                 # English translations
│   │   └── el.json                 # Greek translations
│   ├── images/                     # Product images
│   ├── index.html                  # Home page
│   ├── products.html               # Products page
│   ├── product.html                # Product detail
│   ├── cart.html                   # Shopping cart
│   ├── checkout.html               # Checkout page
│   ├── success.html                # Success page
│   ├── cancel.html                 # Payment cancelled
│   ├── admin.html                  # Admin panel
│   ├── robots.txt                  # SEO
│   └── sitemap.xml                 # SEO
├── database/
│   └── db.js                       # Database initialization
├── backend/
│   └── (API endpoints in server.js)
├── docker/
│   └── (Docker configurations)
├── server.js                       # Main Express server
├── package.json                    # Dependencies
├── .env                            # Environment variables
├── Dockerfile                      # Docker image
├── docker-compose.yml              # Docker compose
└── README.md                       # This file
```

## Quick Start

### Prerequisites
- Docker and Docker Compose (Recommended)
- OR: Node.js 18+, npm, SQLite3

### Option 1: Using Docker (Recommended)

```bash
# Navigate to project directory
cd cosmetics-shop

# Build and run with Docker Compose
docker compose up

# Website will be available at http://localhost:3000
```

### Option 2: Manual Installation

```bash
# Install dependencies
npm install

# Start the server
npm start

# Website will be available at http://localhost:3000
```

## Configuration

### Environment Variables (.env)

```env
# Stripe Keys (Get from https://stripe.com)
STRIPE_SECRET_KEY=sk_test_your_key
STRIPE_PUBLIC_KEY=pk_test_your_key

# Admin Credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123

# Email Configuration (Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Database
DATABASE_PATH=./database/cosmetics.db
NODE_ENV=production
PORT=3000
```

## Usage

### Main Website
1. Open http://localhost:3000
2. Browse products
3. Use language selector (top right)
4. Add products to cart
5. Proceed to checkout with Stripe

### Admin Panel
1. Navigate to http://localhost:3000/admin
2. Login with credentials:
   - Username: `admin`
   - Password: `admin123`
3. Manage products, coupons, shipping, orders

### Admin Features
- **Products**: Add, edit, delete with images
- **Coupons**: Create discount codes
- **Shipping**: Manage shipping methods
- **Orders**: View all orders
- **Subscribers**: Email list
- **Generate**: Auto-generate sample products

## Default Data

The application comes with default shipping methods:
- Standard Shipping: €5.00 (5 days)
- Express Shipping: €15.00 (2 days)
- Pickup: €0.00 (1 day)

## Stripe Test Cards

For testing payments use these Stripe test cards:

```
4242 4242 4242 4242 - Visa (Succeeds)
4000 0000 0000 9995 - Card Declined
5555 5555 5555 4444 - Mastercard
```

**Expiry**: Any future date
**CVC**: Any 3 digits

## Languages Supported

- 🇬🇧 **English** (Default)
- 🇬🇷 **Greek** (Ελληνικά)

All UI elements, products, descriptions, and emails support both languages.

## Database Schema

### Products
- id, name_en, name_el, description_en, description_el
- brand, category, price, stock
- ingredients, skin_type, image

### Orders
- id, email, total, status, payment_id
- customer info (name, address, city, postal_code, country, phone)
- shipping_method_id, created_at

### Order Items
- id, order_id, product_id, product_name
- quantity, price

### Coupons
- id, code, discount_type, discount_value
- expiration_date, max_uses, uses

### Shipping Methods
- id, name, price, estimated_days

### Newsletter Subscribers
- id, email, created_at

### Promotions
- id, title, description, discount
- start_date, end_date

## API Endpoints

### Products
```
GET    /api/products                 - Get all products
GET    /api/product/:id              - Get single product
POST   /api/products                 - Create product (Auth)
PUT    /api/products/:id             - Update product (Auth)
DELETE /api/products/:id             - Delete product (Auth)
```

### Coupons
```
GET    /api/coupons                  - List coupons (Auth)
POST   /api/coupons                  - Create coupon (Auth)
DELETE /api/coupons/:id              - Delete coupon (Auth)
POST   /api/validate-coupon          - Validate coupon
```

### Shipping
```
GET    /api/shipping-methods         - Get shipping methods
POST   /api/shipping-methods         - Add shipping (Auth)
DELETE /api/shipping-methods/:id     - Delete shipping (Auth)
```

### Orders
```
GET    /api/orders                   - List orders (Auth)
GET    /api/orders/:id               - Get order details
```

### Payment
```
POST   /api/create-checkout-session  - Create Stripe session
POST   /api/process-payment          - Process successful payment
```

### Newsletter
```
POST   /api/newsletter               - Subscribe to newsletter
GET    /api/newsletter-subscribers   - List subscribers (Auth)
```

### Admin
```
POST   /api/admin/login              - Admin login
POST   /api/admin/generate-products  - Generate sample products (Auth)
```

## Features Breakdown

### Multilingual System
- Dynamic language switching via selector
- All text stored in JSON files
- localStorage persistence
- Product names and descriptions in both languages

### Shopping Cart
- Add/remove items
- Update quantities
- Persistent storage (localStorage)
- Coupon support
- Real-time total calculation

### Coupon System
- Percentage-based discounts
- Fixed amount discounts
- Expiration dates
- Usage limits
- Code validation

### Payment Processing
- Stripe integration
- Secure checkout
- Test mode support
- Order confirmation emails

### Admin Management
- Secure login system
- Product CRUD operations
- Image uploads
- Coupon management
- Shipping method configuration
- Order viewing
- Subscriber list

### SEO Optimization
- Meta tags on all pages
- Open Graph tags
- sitemap.xml
- robots.txt
- JSON-LD structured data
- SEO-friendly URLs

## Deployment

### Deploy with Docker
```bash
# Build image
docker build -t cosmetics-shop .

# Run container
docker run -p 3000:3000 cosmetics-shop

# Or use docker-compose
docker compose up -d
```

### Deploy to Production
1. Update `.env` with production values
2. Set up SSL/HTTPS (use nginx or let's Encrypt)
3. Configure proper database path
4. Set up email service credentials
5. Configure Stripe live keys
6. Deploy using Docker

## Troubleshooting

### Port 3000 Already in Use
```bash
# Change port in .env
PORT=3001
```

### Database Errors
```bash
# Delete database and reinitialize
rm database/cosmetics.db
npm start
```

### Stripe Issues
- Verify publishable and secret keys
- Check Stripe account is active
- Test with test cards first

### Email Not Sending
- Verify SMTP credentials
- Use Gmail app passwords (not regular password)
- Enable "Less secure app access" if using Gmail
- Check firewall/ports

## Security

### Production Checklist
- [ ] Change admin credentials
- [ ] Use environment variables for secrets
- [ ] Enable HTTPS/SSL
- [ ] Set up rate limiting
- [ ] Validate all inputs
- [ ] Use secure database paths
- [ ] Enable CORS appropriately
- [ ] Update dependencies regularly

## Performance Tips

- Images should be optimized (max 1MB)
- Use CDN for static files in production
- Enable database indexes on large datasets
- Implement pagination for product lists
- Cache product data if needed

## Support & Issues

For issues or feature requests, check:
1. Ensure Node.js 18+ is installed
2. Verify all dependencies installed (`npm install`)
3. Check .env file has correct values
4. Verify database file has write permissions

## License

MIT License - Free to use for personal and commercial projects

## Credits

Built with:
- Node.js & Express
- SQLite3
- Stripe API
- Nodemailer
- Vanilla JavaScript

---

**Ready to launch your cosmetics store?** Run `docker compose up` and start selling! 🚀
