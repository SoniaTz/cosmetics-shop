require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');
const { initializeDatabase, getDatabase } = require('./database/db');
const multer = require('multer');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

let db;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Language files route
app.get('/lang/:lang', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'lang', `${req.params.lang}.json`));
});

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'public/images'));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// Email configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Authentication middleware
function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || auth !== `Bearer ${Buffer.from(process.env.ADMIN_USERNAME + ':' + process.env.ADMIN_PASSWORD).toString('base64')}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// Initialize database and start server
initializeDatabase().then((database) => {
  db = database;
  
  // Migration: Add user_id column to reviews if it doesn't exist
  db.run('ALTER TABLE reviews ADD COLUMN user_id INTEGER REFERENCES users(id)', (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding user_id column:', err);
    } else {
      console.log('Reviews table migration complete');
    }
  });
  
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}).catch((err) => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});

// ==================== ADMIN LOGIN ====================
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  
  if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
    const token = Buffer.from(username + ':' + password).toString('base64');
    res.json({ success: true, token });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// ==================== USER LOGIN/REGISTRATION ====================
app.post('/api/user/register', (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const hashedPassword = Buffer.from(password).toString('base64');
  
  db.run(
    'INSERT INTO users (name, email, password_hash, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
    [name, email, hashedPassword],
    (err) => {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(400).json({ error: 'Email already registered' });
        }
        return res.status(500).json({ error: err.message });
      }
      res.json({ success: true, message: 'User registered successfully' });
    }
  );
});

app.post('/api/user/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Missing email or password' });
  }

  const hashedPassword = Buffer.from(password).toString('base64');

  db.get(
    'SELECT id, name, email FROM users WHERE email = ? AND password_hash = ?',
    [email, hashedPassword],
    (err, user) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = Buffer.from(email + ':' + password).toString('base64');
      res.json({ success: true, token, user: { id: user.id, name: user.name, email: user.email } });
    }
  );
});

// GET user by email (for review ownership check)
app.post('/api/user/by-email', (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }
  
  db.get('SELECT id, name, email, address, city, postal_code, country, phone, first_name, last_name, created_at FROM users WHERE email = ?', [email], (err, user) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  });
});

// DELETE user account
app.post('/api/user/delete', (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }
  
  // Delete user's reviews first
  db.run('DELETE FROM reviews WHERE user_id IN (SELECT id FROM users WHERE email = ?)', [email], (err) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    // Delete the user
    db.run('DELETE FROM users WHERE email = ?', [email], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      res.json({ success: true, message: 'User deleted successfully' });
    });
  });
});

// UPDATE user profile
app.post('/api/user/update', (req, res) => {
  const { email, name, password, address, city, postal_code, country, phone, first_name, last_name } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }
  
  let sql = 'UPDATE users SET ';
  let params = [];
  let updates = [];
  
  if (name !== undefined) {
    updates.push('name = ?');
    params.push(name);
  }
  
  if (password) {
    updates.push('password = ?');
    params.push(password);
  }
  
  if (address !== undefined) {
    updates.push('address = ?');
    params.push(address);
  }
  
  if (city !== undefined) {
    updates.push('city = ?');
    params.push(city);
  }
  
  if (postal_code !== undefined) {
    updates.push('postal_code = ?');
    params.push(postal_code);
  }
  
  if (country !== undefined) {
    updates.push('country = ?');
    params.push(country);
  }
  
  if (phone !== undefined) {
    updates.push('phone = ?');
    params.push(phone);
  }
  
  if (first_name !== undefined) {
    updates.push('first_name = ?');
    params.push(first_name);
  }
  
  if (last_name !== undefined) {
    updates.push('last_name = ?');
    params.push(last_name);
  }
  
  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }
  
  sql += updates.join(', ') + ' WHERE email = ?';
  params.push(email);
  
  db.run(sql, params, function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    res.json({ success: true, message: 'Profile updated successfully' });
  });
});

// GET user orders
app.post('/api/orders/user', (req, res) => {
  const { email } = req.body;
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  db.get('SELECT id FROM users WHERE email = ?', [email], (err, user) => {
    if (err || !user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    db.all('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC', [user.id], (err, orders) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      // Get order items for each order
      const ordersWithItems = orders.map(order => {
        return new Promise((resolve) => {
          db.all('SELECT * FROM order_items WHERE order_id = ?', [order.id], (err, items) => {
            order.items = items || [];
            order.items_count = items ? items.length : 0;
            resolve(order);
          });
        });
      });
      
      Promise.all(ordersWithItems).then(finalOrders => {
        res.json(finalOrders);
      });
    });
  });
});

// ==================== PRODUCTS API ====================

// GET all products
app.get('/api/products', (req, res) => {
  const category = req.query.category;
  let query = 'SELECT * FROM products';
  const params = [];

  if (category) {
    query += ' WHERE category = ?';
    params.push(category);
  }

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// ==================== REVIEWS API ====================

// GET reviews for a product
app.get('/api/reviews/:productId', (req, res) => {
  const { productId } = req.params;
  db.all('SELECT id, product_id, user_id, user_name, rating, comment, created_at FROM reviews WHERE product_id = ? ORDER BY created_at DESC', [productId], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// GET average rating for a product
app.get('/api/reviews/:productId/average', (req, res) => {
  const { productId } = req.params;
  db.get('SELECT AVG(rating) as average, COUNT(*) as count FROM reviews WHERE product_id = ?', [productId], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ average: row.average || 0, count: row.count || 0 });
  });
});

// DELETE a review (user can delete their own review)
app.delete('/api/reviews/user/:id', (req, res) => {
  const { id } = req.params;
  const authHeader = req.headers.authorization;
  
  // Decode the user token to get user_id
  if (!authHeader) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  try {
    const token = authHeader.replace('Bearer ', '');
    const decoded = Buffer.from(token, 'base64').toString();
    const email = decoded.split(':')[0];
    
    // Get user by email
    db.get('SELECT id FROM users WHERE email = ?', [email], (err, user) => {
      if (err || !user) {
        return res.status(401).json({ error: 'Invalid token' });
      }
      
      // Check if the review belongs to this user
      db.get('SELECT user_id FROM reviews WHERE id = ?', [id], (err, review) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        
        if (!review) {
          return res.status(404).json({ error: 'Review not found' });
        }
        
        // Allow delete if user owns the review or is admin
        if (review.user_id !== user.id) {
          return res.status(403).json({ error: 'You can only delete your own reviews' });
        }
        
        // Delete the review
        db.run('DELETE FROM reviews WHERE id = ?', [id], function(err) {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          res.json({ success: true, message: 'Review deleted' });
        });
      });
    });
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
});

// POST add a review
app.post('/api/reviews', (req, res) => {
  const { product_id, user_name, rating, comment, user_id } = req.body;
  
  if (!product_id || !rating) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  if (rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating must be between 1 and 5' });
  }
  
  // If no user is logged in, use "Anonymous" as default name
  const finalUserName = user_id ? (user_name || 'Anonymous') : 'Anonymous';
  
  // If user_id is provided, include it in the insert
  if (user_id) {
    const query = 'INSERT INTO reviews (product_id, user_id, user_name, rating, comment) VALUES (?, ?, ?, ?, ?)';
    db.run(query, [product_id, user_id, finalUserName, rating, comment || ''], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ id: this.lastID, success: true });
    });
  } else {
    const query = 'INSERT INTO reviews (product_id, user_name, rating, comment) VALUES (?, ?, ?, ?)';
    db.run(query, [product_id, finalUserName, rating, comment || ''], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ id: this.lastID, success: true });
    });
  }
});

// DELETE a review - no auth required for testing
app.delete('/api/reviews/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM reviews WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ success: true, message: 'Review deleted' });
  });
});

// GET all reviews (for admin) - no auth required for testing
app.get('/api/admin/reviews', (req, res) => {
  db.all(`SELECT r.*, p.name_en, p.name_el 
          FROM reviews r 
          LEFT JOIN products p ON r.product_id = p.id 
          ORDER BY r.created_at DESC`, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// GET single product
app.get('/api/product/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM products WHERE id = ?', [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'Product not found' });
    }
    // Get additional images
    db.all('SELECT * FROM product_images WHERE product_id = ? ORDER BY sort_order', [id], (err, images) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      row.images = images || [];
      res.json(row);
    });
  });
});

// GET product images
app.get('/api/product/:id/images', (req, res) => {
  const { id } = req.params;
  db.all('SELECT * FROM product_images WHERE product_id = ? ORDER BY sort_order', [id], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows || []);
  });
});

// POST add product image
app.post('/api/product/:id/images', requireAuth, upload.single('image'), (req, res) => {
  const { id } = req.params;
  if (!req.file) {
    return res.status(400).json({ error: 'No image provided' });
  }
  
  // Get max sort_order
  db.get('SELECT MAX(sort_order) as max_order FROM product_images WHERE product_id = ?', [id], (err, result) => {
    const sortOrder = (result && result.max_order !== null) ? result.max_order + 1 : 0;
    
    db.run('INSERT INTO product_images (product_id, image_path, sort_order) VALUES (?, ?, ?)', 
      [id, req.file.filename, sortOrder], function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.json({ id: this.lastID, success: true });
      });
  });
});

// DELETE product image
app.delete('/api/product/:id/images/:imageId', requireAuth, (req, res) => {
  const { id, imageId } = req.params;
  
  db.run('DELETE FROM product_images WHERE id = ? AND product_id = ?', [imageId, id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ success: true });
  });
});

// POST create product
app.post('/api/products', requireAuth, upload.single('image'), (req, res) => {
  const { name_en, name_el, short_description_en, short_description_el, description_en, description_el, brand, category, price, stock, ingredients_en, ingredients_el, skin_type, featured, new_arrival } = req.body;
  const image = req.file ? req.file.filename : 'default.jpg';
  const isFeatured = featured === 'on' || featured === '1' || featured === true ? 1 : 0;
  const isNewArrival = new_arrival === 'on' || new_arrival === '1' || new_arrival === true ? 1 : 0;

  const query = `INSERT INTO products (name_en, name_el, short_description_en, short_description_el, description_en, description_el, brand, category, price, stock, ingredients_en, ingredients_el, skin_type, image, featured, new_arrival)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  db.run(query, [name_en, name_el, short_description_en, short_description_el, description_en, description_el, brand, category, price, stock, ingredients_en, ingredients_el, skin_type, image, isFeatured, isNewArrival], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ id: this.lastID, success: true });
  });
});

// PUT update product
app.put('/api/products/:id', requireAuth, upload.single('image'), (req, res) => {
  const { id } = req.params;
  const { name_en, name_el, short_description_en, short_description_el, description_en, description_el, brand, category, price, stock, ingredients_en, ingredients_el, skin_type, featured, new_arrival } = req.body;

  db.get('SELECT * FROM products WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Product not found' });

    let image = row.image;
    if (req.file) {
      if (row.image && row.image !== 'default.jpg') {
        try {
          fs.unlinkSync(path.join(__dirname, 'public/images', row.image));
        } catch (e) {}
      }
      image = req.file.filename;
    }

    const isFeatured = featured === 'on' || featured === '1' || featured === true ? 1 : 0;
    const isNewArrival = new_arrival === 'on' || new_arrival === '1' || new_arrival === true ? 1 : 0;

    const query = `UPDATE products SET name_en = ?, name_el = ?, short_description_en = ?, short_description_el = ?, description_en = ?, description_el = ?, 
                   brand = ?, category = ?, price = ?, stock = ?, ingredients_en = ?, ingredients_el = ?, skin_type = ?, image = ?, featured = ?, new_arrival = ? 
                   WHERE id = ?`;

    db.run(query, [name_en, name_el, short_description_en, short_description_el, description_en, description_el, brand, category, price, stock, ingredients_en, ingredients_el, skin_type, image, isFeatured, isNewArrival, id], (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ success: true });
    });
  });
});

// DELETE product
app.delete('/api/products/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  
  db.get('SELECT image FROM products WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Product not found' });

    if (row.image && row.image !== 'default.jpg') {
      try {
        fs.unlinkSync(path.join(__dirname, 'public/images', row.image));
      } catch (e) {}
    }

    db.run('DELETE FROM products WHERE id = ?', [id], (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ success: true });
    });
  });
});

// ==================== COUPONS API ====================

app.get('/api/coupons', requireAuth, (req, res) => {
  db.all('SELECT * FROM coupons', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/coupons', requireAuth, (req, res) => {
  const { code, discount_type, discount_value, expiration_date, max_uses } = req.body;
  
  const query = `INSERT INTO coupons (code, discount_type, discount_value, expiration_date, max_uses)
                 VALUES (?, ?, ?, ?, ?)`;
  
  db.run(query, [code.toUpperCase(), discount_type, discount_value, expiration_date, max_uses], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, success: true });
  });
});

app.delete('/api/coupons/:id', requireAuth, (req, res) => {
  db.run('DELETE FROM coupons WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

app.post('/api/validate-coupon', (req, res) => {
  const { code } = req.body;
  
  db.get('SELECT * FROM coupons WHERE code = ?', [code.toUpperCase()], (err, coupon) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!coupon) return res.status(404).json({ error: 'Invalid coupon' });

    const today = new Date().toISOString().split('T')[0];
    if (coupon.expiration_date && coupon.expiration_date < today) {
      return res.status(400).json({ error: 'Coupon expired' });
    }

    if (coupon.max_uses && coupon.uses >= coupon.max_uses) {
      return res.status(400).json({ error: 'Coupon max uses reached' });
    }

    res.json({ success: true, coupon });
  });
});

// ==================== SHIPPING API ====================

app.get('/api/shipping-methods', (req, res) => {
  db.all('SELECT * FROM shipping_methods', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/shipping-methods', requireAuth, (req, res) => {
  const { name, price, estimated_days } = req.body;
  
  db.run('INSERT INTO shipping_methods (name, price, estimated_days) VALUES (?, ?, ?)',
    [name, price, estimated_days], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, success: true });
  });
});

app.delete('/api/shipping-methods/:id', requireAuth, (req, res) => {
  db.run('DELETE FROM shipping_methods WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// ==================== ORDERS API ====================

app.get('/api/orders', requireAuth, (req, res) => {
  db.all('SELECT * FROM orders ORDER BY created_at DESC', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/orders/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM orders WHERE id = ?', [id], (err, order) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    db.all('SELECT * FROM order_items WHERE order_id = ?', [id], (err, items) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ ...order, items });
    });
  });
});

// ==================== NEWSLETTER API ====================

app.post('/api/newsletter', (req, res) => {
  const { email } = req.body;
  
  db.run('INSERT OR IGNORE INTO newsletter_subscribers (email) VALUES (?)', [email], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

app.get('/api/newsletter-subscribers', requireAuth, (req, res) => {
  db.all('SELECT * FROM newsletter_subscribers', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Complaints API
app.get('/api/complaints', requireAuth, (req, res) => {
  db.all('SELECT * FROM complaints ORDER BY created_at DESC', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/complaints', (req, res) => {
  const { name, email, phone, orderNumber, subject, message } = req.body;
  
  if (!name || !email || !subject || !message) {
    return res.status(400).json({ error: 'All required fields must be filled' });
  }
  
  db.run(`INSERT INTO complaints (name, email, phone, order_number, subject, message) VALUES (?, ?, ?, ?, ?, ?)`,
    [name, email, phone || null, orderNumber || null, subject, message],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, message: 'Complaint submitted successfully' });
    }
  );
});

app.patch('/api/complaints/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  db.run('UPDATE complaints SET status = ? WHERE id = ?', [status, id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Complaint status updated' });
  });
});

// ==================== STRIPE CHECKOUT ====================

app.post('/api/create-checkout-session', (req, res) => {
  const { items, couponCode, shippingMethod } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ error: 'No items in cart' });
  }

  db.get('SELECT * FROM shipping_methods WHERE id = ?', [shippingMethod], (err, shipping) => {
    if (err) return res.status(500).json({ error: err.message });

    const shippingCost = shipping ? shipping.price : 5;
    let lineItems = [];
    let total = 0;

    const processItems = (index) => {
      if (index >= items.length) {
        finalizseCheckout();
        return;
      }

      const item = items[index];
      db.get('SELECT * FROM products WHERE id = ?', [item.id], (err, product) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!product) return res.status(404).json({ error: 'Product not found' });

        lineItems.push({
          price_data: {
            currency: 'eur',
            product_data: {
              name: product.name_en
            },
            unit_amount: Math.round(product.price * 100)
          },
          quantity: item.quantity
        });

        total += product.price * item.quantity;
        processItems(index + 1);
      });
    };

    const finalizseCheckout = async () => {
      let discount = 0;

      if (couponCode) {
        await new Promise((resolve) => {
          db.get('SELECT * FROM coupons WHERE code = ?', [couponCode.toUpperCase()], (err, coupon) => {
            if (coupon) {
              if (coupon.discount_type === 'percentage') {
                discount = total * (coupon.discount_value / 100);
              } else {
                discount = coupon.discount_value;
              }
            }
            resolve();
          });
        });
      }

      const finalTotal = total - discount + shippingCost;

      lineItems.push({
        price_data: {
          currency: 'eur',
          product_data: {
            name: 'Shipping'
          },
          unit_amount: Math.round(shippingCost * 100)
        },
        quantity: 1
      });

      try {
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          line_items: lineItems,
          mode: 'payment',
          success_url: `${process.env.DOMAIN || 'http://localhost:3000'}/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${process.env.DOMAIN || 'http://localhost:3000'}/cancel`,
          metadata: {
            coupon: couponCode || '',
            shipping_method: shippingMethod
          }
        });

        res.json({ sessionId: session.id });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    };

    processItems(0);
  });
});

app.post('/api/process-payment', (req, res) => {
  const { sessionId, email, firstName, lastName, address, city, postalCode, country, phone, items, shippingMethod, couponCode } = req.body;

  db.get('SELECT * FROM shipping_methods WHERE id = ?', [shippingMethod], (err, shipping) => {
    if (err) return res.status(500).json({ error: err.message });

    const shippingCost = shipping ? shipping.price : 5;
    let total = 0;
    let orderItems = [];
    let productCount = 0;

    items.forEach((item) => {
      db.get('SELECT * FROM products WHERE id = ?', [item.id], (err, product) => {
        if (product) {
          total += product.price * item.quantity;
          orderItems.push({
            product_id: product.id,
            product_name: product.name_en,
            quantity: item.quantity,
            price: product.price
          });
        }

        productCount++;
        if (productCount === items.length) {
          finalizateOrder();
        }
      });
    });

    const finalizateOrder = () => {
      let discount = 0;

      db.get('SELECT * FROM coupons WHERE code = ?', [couponCode], (err, coupon) => {
        if (coupon) {
          if (coupon.discount_type === 'percentage') {
            discount = total * (coupon.discount_value / 100);
          } else {
            discount = coupon.discount_value;
          }

          db.run('UPDATE coupons SET uses = uses + 1 WHERE id = ?', [coupon.id]);
        }

        const finalTotal = total - discount + shippingCost;

        const orderQuery = `INSERT INTO orders (email, total, status, payment_id, first_name, last_name, address, city, postal_code, country, phone, shipping_method_id)
                           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        db.run(orderQuery, [email, finalTotal, 'completed', sessionId, firstName, lastName, address, city, postalCode, country, phone, shippingMethod], function(err) {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          const orderId = this.lastID;
          let itemsProcessed = 0;

          orderItems.forEach((item) => {
            const itemQuery = `INSERT INTO order_items (order_id, product_id, product_name, quantity, price) VALUES (?, ?, ?, ?, ?)`;
            db.run(itemQuery, [orderId, item.product_id, item.product_name, item.quantity, item.price], (err) => {
              if (err) console.error('Error inserting order item:', err);
              itemsProcessed++;

              if (itemsProcessed === orderItems.length) {
                // Send confirmation email
                SendOrderConfirmationEmail(email, orderId, finalTotal);
                res.json({ success: true, orderId });
              }
            });
          });
        });
      });
    };
  });
});

// ==================== AI PRODUCT GENERATOR ====================

app.post('/api/admin/generate-products', requireAuth, (req, res) => {
  const brands = ['L\'Oreal', 'Estee Lauder', 'Clinique', 'Dior', 'Chanel', 'MAC', 'Maybelline', 'Shiseido'];
  const categories = ['Skincare', 'Makeup', 'Haircare', 'Fragrance', 'Bath & Body'];
  const skinTypes = ['Oily', 'Dry', 'Combination', 'Sensitive', 'Normal'];

  const productDescriptionsEn = [
    'Premium quality formula designed for long-lasting coverage',
    'Professional grade product with luxury ingredients',
    'Dermatologist tested for all skin types',
    'Advanced technology for visible results',
    'Cruelty-free and eco-friendly formula',
    'Hypoallergenic and gentle on sensitive skin',
    'Rich formula with natural extracts',
    'Lightweight texture that feels like silk',
    'Provides deep hydration for 24 hours',
    'Instant results with long-term benefits'
  ];

  const productDescriptionsEl = [
    'Η ανώτατη ποιότητα διατυπώθηκε για μακροχρόνια κάλυψη',
    'Επαγγελματικό προϊόν με πολυτελή συστατικά',
    'Δερματολογικά δοκιμάζεται για όλους τους τύπους δέρματος',
    'Προηγμένη τεχνολογία για ορατά αποτελέσματα',
    'Δεν περιέχει κρυέλτι και φιλικότητα προς το περιβάλλον',
    'Υποαλλεργικό και ήπιο για ευαίσθητο δέρμα',
    'Πλούσια φόρμουλα με φυσικά εκχυλίσματα',
    'Ελαφρώ υφή που αισθάνεται σαν μετάξι',
    'Παρέχει βαθιά ενυδάτωση για 24 ώρες',
    'Άμεσα αποτελέσματα με μακροπρόθεσμα οφέλη'
  ];

  const ingredients = [
    'Hyaluronic Acid, Vitamin C, Retinol, Green Tea Extract',
    'Collagen, Peptides, Niacinamide, Ceramides',
    'Retinol, Vitamin E, Squalane, Rose Hip Oil',
    'Salicylic Acid, Tea Tree Oil, Zinc, Charcoal',
    'Lactic Acid, Glycerin, Aloe Vera, Chamomile',
    'Vitamin A, Vitamin B5, Ferulic Acid, Tocopherol',
    'AHA/BHA Complex, Witch Hazel, Lavender Oil',
    'Jojoba Oil, Argan Oil, Rosemary Extract, Lavender'
  ];

  let productsGenerated = 0;

  for (let i = 0; i < 12; i++) {
    const name = `Premium ${brands[Math.floor(Math.random() * brands.length)]} ${categories[Math.floor(Math.random() * categories.length)]} Product ${i + 1}`;
    const nameEn = name;
    const nameEl = `Πρώτης ποιότητας ${name} Ελληνικά`;
    
    const descEn = productDescriptionsEn[Math.floor(Math.random() * productDescriptionsEn.length)];
    const descEl = productDescriptionsEl[Math.floor(Math.random() * productDescriptionsEl.length)];
    
    const price = (Math.random() * 150 + 20).toFixed(2);
    const stock = Math.floor(Math.random() * 100) + 10;
    const ingredient = ingredients[Math.floor(Math.random() * ingredients.length)];
    const skinType = skinTypes[Math.floor(Math.random() * skinTypes.length)];
    const brand = brands[Math.floor(Math.random() * brands.length)];
    const category = categories[Math.floor(Math.random() * categories.length)];
    const isFeatured = i < 3 ? 1 : 0; // First 3 products featured
    const isNewArrival = i >= 3 && i < 6 ? 1 : 0; // Next 3 products new arrival

    const query = `INSERT INTO products (name_en, name_el, description_en, description_el, brand, category, price, stock, ingredients, skin_type, image, featured, new_arrival)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    db.run(query, [nameEn, nameEl, descEn, descEl, brand, category, price, stock, ingredient, skinType, 'default.jpg', isFeatured, isNewArrival], (err) => {
      if (err) console.error('Error generating product:', err);
      productsGenerated++;

      if (productsGenerated === 12) {
        res.json({ success: true, message: '12 sample products generated' });
      }
    });
  }
});

// ==================== Serve HTML Pages ====================

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/products', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'products.html'));
});

app.get('/product/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'product.html'));
});

app.get('/cart', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'cart.html'));
});

app.get('/wishlist', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'wishlist.html'));
});

app.get('/profile', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'profile.html'));
});

app.get('/checkout', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'checkout.html'));
});

app.get('/success', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'success.html'));
});

app.get('/cancel', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'cancel.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/contact', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'contact.html'));
});

app.get('/about', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'about.html'));
});

// Greek versions
app.get('/el', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index-el.html'));
});

app.get('/el/products', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'products-el.html'));
});

app.get('/el/product/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'product-el.html'));
});

app.get('/el/cart', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'cart-el.html'));
});

app.get('/el/wishlist', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'wishlist-el.html'));
});

app.get('/el/profile', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'profile-el.html'));
});

app.get('/el/checkout', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'checkout-el.html'));
});

app.get('/el/success', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'success-el.html'));
});

app.get('/el/cancel', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'cancel-el.html'));
});

app.get('/el/contact', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'contact-el.html'));
});

app.get('/el/about', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'about-el.html'));
});

app.get('/sitemap.xml', (req, res) => {
  res.type('application/xml');
  res.sendFile(path.join(__dirname, 'public', 'sitemap.xml'));
});

app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.sendFile(path.join(__dirname, 'public', 'robots.txt'));
});

// ==================== EMAIL FUNCTIONS ====================

function SendOrderConfirmationEmail(email, orderId, total) {
  const mailOptions = {
    from: process.env.SMTP_USER,
    to: email,
    subject: `Order Confirmation - #${orderId}`,
    html: `
      <h2>Thank you for your order!</h2>
      <p>Order Number: #${orderId}</p>
      <p>Total: €${total.toFixed(2)}</p>
      <p>Your order will be processed shortly.</p>
      <p>Best regards,<br>khiones beauty Team</p>
    `
  };

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) console.error('Error sending email:', err);
    else console.log('Email sent:', info.response);
  });
}

// 404 handler
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
});
