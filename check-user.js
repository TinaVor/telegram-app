const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./users.db');

db.get(
  'SELECT id, telegram_id, first_name, last_name, username FROM users WHERE id = ?',
  [1],
  (err, user) => {
    if (err) {
      console.error('Database error:', err);
      return;
    }

    if (!user) {
      console.log('User not found');
      return;
    }

    console.log('User found:', user);
    db.close();
  }
);
