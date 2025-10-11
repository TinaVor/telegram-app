const { createClient } = require('@supabase/supabase-js');
const sqlite3 = require('sqlite3').verbose();

// Supabase - conditional initialization for local development
let supabase = null;
let db = null;
if (process.env.NODE_ENV === 'production') {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
  }
} else {
  // Initialize SQLite for local development
  db = new sqlite3.Database('./users.db');

  // Create users table if it doesn't exist
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id TEXT UNIQUE,
    first_name TEXT,
    last_name TEXT,
    username TEXT
  )`);
}

module.exports = { supabase, db };
