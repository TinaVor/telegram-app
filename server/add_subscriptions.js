const { db } = require('./db');
const { randomUUID } = require('crypto');

// Создадим соединение напрямую с users.db, как в db.js для локального development
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const database = new sqlite3.Database(path.join(__dirname, '../users.db'));

// Функция для добавления подписок всем пользователям, у которых их нет
function addSubscriptionsToAllUsers() {
  database.all(
    'SELECT u.id FROM users u LEFT JOIN subscriptions s ON u.id = s.user_id WHERE s.id IS NULL',
    [],
    (err, rows) => {
      if (err) {
        console.error('Error fetching users without subscriptions:', err);
        database.close();
        return;
      }

      if (rows.length === 0) {
        console.log('All users already have active subscriptions.');
        database.close();
        return;
      }

      rows.forEach((row) => {
        const expiryDate = new Date();
        expiryDate.setMonth(expiryDate.getMonth() + 1); // Подписка на месяц
        const expiryStr = expiryDate.toISOString();

        database.run(
          'INSERT INTO subscriptions (id, user_id, status, expired_date) VALUES (?, ?, ?, ?)',
          [randomUUID(), row.id, 'active', expiryStr],
          function (err) {
            if (err) {
              console.error(
                `Error adding subscription for user ${row.id}:`,
                err
              );
            } else {
              console.log(`Added active subscription for user ${row.id}`);
            }
          }
        );
      });

      // Закрываем БД после всех вставок
      setTimeout(() => database.close(), 1000);
    }
  );
}

addSubscriptionsToAllUsers();
