const { exec } = require('child_process');

const sqlite3 = require('sqlite3').verbose();

function testSQLitePromise() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database('./users.db');
    db.get(
      'SELECT id, telegram_id, first_name, last_name, username FROM users WHERE id = ?',
      [1],
      (err, user) => {
        if (err) {
          reject(err);
        } else {
          resolve(user);
        }
        db.close();
      }
    );
  });
}

async function main() {
  try {
    const user = await testSQLitePromise();
    console.log('SQLite Promise test successful:', user);
  } catch (err) {
    console.error('SQLite Promise test failed:', err);
  }
}

main();
