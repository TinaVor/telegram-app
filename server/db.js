const { createClient } = require('@supabase/supabase-js');
const sqlite3 = require('sqlite3').verbose();

// Initialize SQLite database for all environments
const dbPath = process.env.NODE_ENV === 'production' ? '/opt/render/project/src/users.db' : './users.db';
const db = new sqlite3.Database(dbPath);

// Create users table if it doesn't exist
db.run(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_id TEXT UNIQUE,
  first_name TEXT,
  last_name TEXT,
  username TEXT
)`);

// Create ozon_personal_accounts table if it doesn't exist
db.run(`CREATE TABLE IF NOT EXISTS ozon_personal_accounts (
  id TEXT PRIMARY KEY,
  user_id INTEGER,
  client_id TEXT,
  api_key TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
)`);

// Create ozon_orders table if it doesn't exist
db.run(`CREATE TABLE IF NOT EXISTS ozon_orders (
  id TEXT PRIMARY KEY,
  ozon_personal_account_id TEXT,
  client_id TEXT NOT NULL,
  user_id INTEGER,
  slot TEXT,
  status TEXT,
  order_number TEXT,
  cluster_name TEXT,
  stock_name TEXT,
  convenient_slot TEXT,
  isSlotFixed INTEGER DEFAULT 0,
  FOREIGN KEY (ozon_personal_account_id) REFERENCES ozon_personal_accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
)`);

// Create payments table if it doesn't exist
db.run(`CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  user_id INTEGER,
  amount INTEGER,
  plan_type TEXT,
  status TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
)`);

// Create subscriptions table if it doesn't exist
db.run(
  `CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  user_id INTEGER,
  status TEXT,
  remaining_slots INTEGER DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
)`,
  (err) => {
    if (err) {
      console.error('Error creating subscriptions table:', err);
      return;
    }

    // Check if subscriptions are already populated (using callback to ensure table exists)
    db.get(`SELECT COUNT(*) as count FROM subscriptions`, (err, row) => {
      if (err) {
        console.error('Error checking subscriptions count:', err);
        return;
      }
      if (row.count === 0) {
        // Populate subscriptions for existing users with 0 slots
        db.all(`SELECT id FROM users`, (err, rows) => {
          if (err) {
            console.error('Error fetching users:', err);
            return;
          }
          const { randomUUID } = require('crypto');
          rows.forEach((user) => {
            const subscription_id = randomUUID();
            db.run(
              `INSERT INTO subscriptions (id, user_id, status, remaining_slots) VALUES (?, ?, 'inactive', ?)`,
              [subscription_id, user.id, 0],
              function (err) {
                if (err) {
                  console.error(
                    'Error inserting subscription for user:',
                    user.id,
                    err
                  );
                } else {
                  console.log(`Inserted subscription for user: ${user.id}`);
                }
              }
            );
          });
        });
      }
    });
  }
);

// Helper functions for async SQLite operations
function dbAllAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function dbRunAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

// Supabase - conditional initialization for production
let supabase = null;
if (process.env.NODE_ENV === 'production') {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
  }
}

module.exports = {
  supabase,
  db,
  dbAllAsync,
  dbRunAsync,
};
