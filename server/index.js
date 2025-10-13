const express = require('express');
const path = require('path');
const cron = require('node-cron');
const https = require('https');

// Initialize database
const { supabase, db, dbAllAsync, dbRunAsync } = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

// Импорт функций проверки обновлений
const { makeOzonRequestForAccount, checkSlotsForFixing } = require('./ozon-api');

// Основная функция для выполнения запроса ко всем активным пользователям
async function makeOzonRequest() {
  let database;
  if (process.env.NODE_ENV === 'production') {
    // В продакшене используется Supabase
    database = supabase;
    console.log('Используем Supabase для запросов');
  } else {
    // В локале используется SQLite
    if (!db) {
      console.error('База данных SQLite не инициализирована');
      return;
    }
    database = db;
    console.log('Используем SQLite для запросов');
  }

  try {
    console.log('Начинаем выборку пользователей с активными подписками...');

    let activeUsers = [];
    if (process.env.NODE_ENV === 'production') {
      // Запрос к Supabase
      const { data, error } = await database
        .from('subscriptions')
        .select('users!inner(id, telegram_id)')
        .eq('status', 'active');

      if (error) {
        console.error(
          'Ошибка при выборке активных пользователей из Supabase:',
          error
        );
        return;
      }
      activeUsers = data.map((item) => ({
        id: item.users.id,
        telegram_id: item.users.telegram_id,
      }));
    } else {
      // Запрос к SQLite
      const sql_active_users = `
        SELECT DISTINCT users.id, users.telegram_id
        FROM users
        JOIN subscriptions ON users.id = subscriptions.user_id
        WHERE subscriptions.status = 'active'
      `;

      activeUsers = await dbAllAsync(sql_active_users, []);
    }

    for (const user of activeUsers) {
      console.log(
        `Обработка пользователя ID: ${user.id}, Telegram ID: ${user.telegram_id}`
      );

      let accounts = [];
      if (process.env.NODE_ENV === 'production') {
        // Запрос аккаунтов из Supabase
        const { data, error } = await database
          .from('ozon_personal_accounts')
          .select('client_id, api_key')
          .eq('user_id', user.id);

        if (error) {
          console.error(
            `Ошибка при выборке аккаунтов для пользователя ${user.id} из Supabase:`,
            error
          );
          continue;
        }
        accounts = data;
      } else {
        // Запрос аккаунтов из SQLite
        const sql_accounts = `
          SELECT id, client_id, api_key
          FROM ozon_personal_accounts
          WHERE user_id = ?
        `;

        accounts = await dbAllAsync(sql_accounts, [user.id]);
      }

      console.log(
        `Для пользователя ${user.id} найдено ${accounts.length} аккаунтов`
      );

      if (process.env.NODE_ENV === 'production') {
        // В продакшене Supabase
        for (const account of accounts) {
          // Для супа еще не дошли
          await makeOzonRequestForAccount(account.client_id, account.client_id, account.api_key, user.id);
        }
      } else {
        for (const account of accounts) {
          await makeOzonRequestForAccount(account.id, account.client_id, account.api_key, user.id);
        }
      }
    }
  } catch (error) {
    console.error('Ошибка в основной функции makeOzonRequest:', error.message);
  }
}

cron.schedule('*/10 * * * *', () => {
  console.warn('Проверка заказов пользователя (каждые 10 минут)');
  makeOzonRequest();
});
cron.schedule('*/1 * * * *', () => {
  console.warn('Проверка слотов каждую 1 минуту');
  checkSlotsForFixing(); // Добавляем проверку слотов
});

// Middleware
const { requestLogger } = require('./middleware/logger');

app.use(requestLogger);
app.use(express.json());

// Routes
app.use('/api', require('./routes/api'));

// Обслуживание React-аппа в продакшене
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
