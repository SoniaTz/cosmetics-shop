# Cosmetics Shop - Installation & Setup Guide

## ⚡ Quick Start (5 Minutes)

### Prerequisites
- **Docker** and **Docker Compose** installed
- OR **Node.js 18+** and **npm**

### Setup Method 1: Docker (Recommended)

```bash
cd C:\cosmetics-shop
docker compose up
```

Open: http://localhost:3000

✅ **Done!** The store is ready to use.

---

### Setup Method 2: Manual Installation

```bash
# Navigate to project
cd C:\cosmetics-shop

# Install dependencies
npm install

# Start server
npm start
```

Open: http://localhost:3000

---

## 🎯 First Steps

### 1. Access Admin Panel
- **URL**: http://localhost:3000/admin
- **Username**: `admin`
- **Password**: `admin123`

### 2. Generate Sample Products
- Go to Admin → Click "Generate Sample Products"
- 12 realistic cosmetics products will be created

### 3. Test Shopping
- Go to http://localhost:3000
- Add products to cart
- Proceed to checkout
- Use Stripe test card: `4242 4242 4242 4242`

### 4. Switch Language
- Click language selector in top right
- Choose English or Greek
- All content updates instantly

---

## 🔧 Configuration

### Email Setup (Optional)
Edit `.env` file:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

For Gmail:
1. Enable 2-factor authentication
2. Generate [app password](https://myaccount.google.com/apppasswords)
3. Use app password in SMTP_PASS

### Stripe Setup
1. Get keys from [Stripe Dashboard](https://dashboard.stripe.com)
2. Update `.env`:
```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLIC_KEY=pk_test_...
```

---

## 📱 Testing Stripe Payments

Use these test cards:

| Card Number | Status | CVC | Expiry |
|---|---|---|---|
| 4242 4242 4242 4242 | ✅ Succeeds | Any 3 digits | Any future date |
| 4000 0000 0000 9995 | ❌ Declined | Any 3 digits | Any future date |
| 5555 5555 5555 4444 | ✅ Succeeds (MC) | Any 3 digits | Any future date |

---

## 🗂️ File Structure Overview

### Key Files:
- `server.js` - Main backend (all APIs)
- `package.json` - Dependencies
- `public/index.html` - Home page
- `public/js/*.js` - Frontend JavaScript
- `public/css/styles.css` - All styles
- `database/db.js` - Database setup
- `public/lang/en.json` - English translations
- `public/lang/el.json` - Greek translations

### Pages:
- `/` - Home page with featured products
- `/products` - All products with filters
- `/product/:id` - Product detail
- `/cart` - Shopping cart
- `/checkout` - Payment checkout
- `/success` - Order confirmation
- `/cancel` - Payment cancelled
- `/admin` - Admin panel

---

## 📊 Admin Features

### Products
- ➕ Add new product
- ✏️ Edit product (name, price, stock, image)
- 🗑️ Delete product
- 🤖 Auto-generate cosmetics products

### Coupons
- ➕ Create discount codes
- Set type: percentage or fixed amount
- Set expiration dates
- Set max uses

### Shipping Methods
- ➕ Add shipping option
- Set price and delivery days
- Default options: Standard, Express, Pickup

### Orders
- 📋 View all orders
- 👁️ See order details
- 📊 Track customer info

### Subscribers
- 📧 View newsletter subscribers
- Export email list

---

## 🌍 Language System

### Supported Languages:
✅ English (en)
✅ Greek (el)

### How It Works:
1. Language preference stored in browser (localStorage)
2. Translations loaded from `/public/lang/{language}.json`
3. All UI elements update dynamically
4. Product descriptions support both languages

### Adding More Languages:
1. Create `/public/lang/es.json` (for Spanish example)
2. Copy English translations and translate
3. Update language selector in HTML

---

## 🛒 Commerce Features

### Shopping Cart
- Add items with quantity
- Remove items
- Update quantities
- Real-time calculation
- Persistent storage

### Coupons
```
Example: SUMMER50 (50% discount)
- Type: Percentage
- Value: 50
- Valid until: 2024-12-31
```

### Shipping
- Standard: €5 (5 days)
- Express: €15 (2 days)
- Pickup: €0 (1 day)

### Checkout Flow
1. Enter shipping address
2. Select shipping method
3. Enter payment details
4. Review order
5. Pay with Stripe

---

## 🔐 Security Notes

### Master Admin:
- **Username**: `admin`
- **Password**: `admin123`
- ⚠️ **Change these in production!**

### API Authentication:
- Admin endpoints require Bearer token
- Generated from admin username:password
- Token stored in browser local storage

---

## 🚀 Production Deployment

### Before Going Live:
1. ✅ Change admin password
2. ✅ Update Stripe keys (live keys)
3. ✅ Configure SMTP email properly
4. ✅ Set up SSL/HTTPS
5. ✅ Update database backup strategy
6. ✅ Test all payment flows

### Deployment Options:
- **Docker**: `docker compose up -d`
- **Heroku**: Configure with Procfile
- **AWS/Azure**: Use container deployment
- **VPS**: Run with PM2/Screen

---

## 🐛 Troubleshooting

### Port 3000 in use?
```bash
# Use different port
PORT=3001 npm start
```

### Database locked?
```bash
# Delete database and restart
rm database/cosmetics.db
npm start
```

### Stripe rejections?
- ✅ Check API keys
- ✅ Verify webhook settings
- ✅ Test with test cards first
- ✅ Check firewall

### Email not sending?
- ✅ Verify SMTP credentials
- ✅ Check firewall ports (587)
- ✅ Use Gmail app password
- ✅ Check spam folder

---

## 📞 Support

### Common Issues:

**"Cannot find module 'sqlite3'"**
```bash
npm install sqlite3
```

**"Port already in use"**
```bash
# Find process on port 3000
netstat -ano | findstr :3000
# Kill it or use different port
```

**"Database file not found"**
```bash
# Create it manually
mkdir database
touch database/cosmetics.db
```

---

## 🎉 You're Ready!

Your cosmetics e-commerce store is now running! 

**Next Steps:**
1. Generate sample products
2. Test the checkout flow
3. Customize branding
4. Add real products
5. Deploy to production

**Happy selling! 🛍️**
