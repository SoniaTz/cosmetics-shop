const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, 'cosmetics.db');

function initializeDatabase() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Error opening database:', err);
        reject(err);
        return;
      }

      db.serialize(() => {
        // Users table
        db.run(`CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          address TEXT,
          city TEXT,
          postal_code TEXT,
          country TEXT,
          phone TEXT,
          first_name TEXT,
          last_name TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Products table
        db.run(`CREATE TABLE IF NOT EXISTS products (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name_en TEXT NOT NULL,
          name_el TEXT NOT NULL,
          short_description_en TEXT,
          short_description_el TEXT,
          description_en TEXT,
          description_el TEXT,
          brand TEXT,
          category TEXT,
          price REAL NOT NULL,
          stock INTEGER NOT NULL DEFAULT 0,
          ingredients_en TEXT,
          ingredients_el TEXT,
          skin_type TEXT,
          image TEXT DEFAULT 'default.jpg',
          featured INTEGER DEFAULT 0,
          new_arrival INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Add missing columns to existing products table
        db.all(`PRAGMA table_info(products)`, [], (err, columns) => {
          if (!err && columns) {
            const columnNames = columns.map(c => c.name);
            if (!columnNames.includes('short_description_en')) {
              try { db.exec(`ALTER TABLE products ADD COLUMN short_description_en TEXT`); } catch (e) {}
            }
            if (!columnNames.includes('short_description_el')) {
              try { db.exec(`ALTER TABLE products ADD COLUMN short_description_el TEXT`); } catch (e) {}
            }
            if (!columnNames.includes('ingredients_en')) {
              try { db.exec(`ALTER TABLE products ADD COLUMN ingredients_en TEXT`); } catch (e) {}
            }
            if (!columnNames.includes('ingredients_el')) {
              try { db.exec(`ALTER TABLE products ADD COLUMN ingredients_el TEXT`); } catch (e) {}
            }
          }
        });

        // Product Images table (for multiple images)
        db.run(`CREATE TABLE IF NOT EXISTS product_images (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          product_id INTEGER NOT NULL,
          image_path TEXT NOT NULL,
          sort_order INTEGER DEFAULT 0,
          FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
        )`);

        // Orders table
        db.run(`CREATE TABLE IF NOT EXISTS orders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT NOT NULL,
          total REAL NOT NULL,
          status TEXT DEFAULT 'pending',
          payment_id TEXT UNIQUE,
          first_name TEXT,
          last_name TEXT,
          address TEXT,
          city TEXT,
          postal_code TEXT,
          country TEXT,
          phone TEXT,
          shipping_method_id INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(shipping_method_id) REFERENCES shipping_methods(id)
        )`);

        // Order Items table
        db.run(`CREATE TABLE IF NOT EXISTS order_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          order_id INTEGER NOT NULL,
          product_id INTEGER NOT NULL,
          product_name TEXT NOT NULL,
          quantity INTEGER NOT NULL,
          price REAL NOT NULL,
          FOREIGN KEY(order_id) REFERENCES orders(id),
          FOREIGN KEY(product_id) REFERENCES products(id)
        )`);

        // Coupons table
        db.run(`CREATE TABLE IF NOT EXISTS coupons (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          code TEXT UNIQUE NOT NULL,
          discount_type TEXT NOT NULL,
          discount_value REAL NOT NULL,
          expiration_date DATE,
          max_uses INTEGER,
          uses INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Shipping Methods table
        db.run(`CREATE TABLE IF NOT EXISTS shipping_methods (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          price REAL NOT NULL,
          estimated_days INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Newsletter Subscribers table
        db.run(`CREATE TABLE IF NOT EXISTS newsletter_subscribers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Promotions table
        db.run(`CREATE TABLE IF NOT EXISTS promotions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          description TEXT,
          discount REAL NOT NULL,
          start_date DATE,
          end_date DATE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Complaints table
        db.run(`CREATE TABLE IF NOT EXISTS complaints (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT NOT NULL,
          phone TEXT,
          order_number TEXT,
          subject TEXT NOT NULL,
          message TEXT NOT NULL,
          status TEXT DEFAULT 'pending',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Abandoned Carts table
        db.run(`CREATE TABLE IF NOT EXISTS abandoned_carts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT NOT NULL,
          cart_data TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          email_sent INTEGER DEFAULT 0
        )`);

        // Reviews table
        db.run(`CREATE TABLE IF NOT EXISTS reviews (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          product_id INTEGER NOT NULL,
          user_id INTEGER,
          user_name TEXT NOT NULL,
          rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
          comment TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(product_id) REFERENCES products(id),
          FOREIGN KEY(user_id) REFERENCES users(id)
        )`);

        // Insert default shipping methods
        db.run(`INSERT OR IGNORE INTO shipping_methods (name, price, estimated_days) VALUES (?, ?, ?)`,
          ['Standard Shipping', 5.00, 5], (err) => {
          if (err) console.error('Error inserting standard shipping:', err);
        });

        db.run(`INSERT OR IGNORE INTO shipping_methods (name, price, estimated_days) VALUES (?, ?, ?)`,
          ['Express Shipping', 15.00, 2], (err) => {
          if (err) console.error('Error inserting express shipping:', err);
        });

        db.run(`INSERT OR IGNORE INTO shipping_methods (name, price, estimated_days) VALUES (?, ?, ?)`,
          ['Pickup', 0.00, 1], (err) => {
          if (err) console.error('Error inserting pickup:', err);
        });

        console.log('Database initialized successfully');
        
        // Add new_arrival column if it doesn't exist (for existing databases)
        db.run(`ALTER TABLE products ADD COLUMN new_arrival INTEGER DEFAULT 0`, (err) => {
          if (err && !err.message.includes('duplicate column name')) {
            console.error('Error adding new_arrival column:', err);
          }
        });
        
        resolve(db);
      });
    });
  });
}

function getDatabase() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Error opening database:', err);
        reject(err);
      } else {
        resolve(db);
      }
    });
  });
}

module.exports = { initializeDatabase, getDatabase, DB_PATH };
