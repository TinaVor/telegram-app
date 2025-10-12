const express = require('express');
const path = require('path');
const cron = require('node-cron');
const https = require('https');

// Initialize database
const { supabase, db } = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

// Функция для выполнения запроса к Ozon API для одного аккаунта
async function makeOzonRequestForAccount(ozonPersonalAccountId, clientId, apiKey, userId) {
  try {
    console.log(`Выполняем запрос к Ozon API для Client-Id: ${clientId}`);

    const response = await fetch(
      'https://api-seller.ozon.ru/v3/supply-order/list',
      {
        method: 'POST',
        headers: {
          'Client-Id': clientId,
          'Api-Key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filter: {
            states: ['DATA_FILLING', 'READY_TO_SUPPLY'],
          },
          limit: 100,
          sort_by: 'ORDER_CREATION',
        }),
      }
    );

    const data = await response.json();

    const ids = data?.order_ids ?? [];

    console.log(`Для Client-Id ${clientId}, ids:`, ids);

    if (ids.length) {
      const chunkSize = 50;
      const idChunks = [];
      for (let i = 0; i < ids.length; i += chunkSize) {
        idChunks.push(ids.slice(i, i + chunkSize));
      }

      let allResults = { orders: [] };

      for (const chunk of idChunks) {
        const response2 = await fetch(
          'https://api-seller.ozon.ru/v3/supply-order/get',
          {
            method: 'POST',
            headers: {
              'Client-Id': clientId,
              'Api-Key': apiKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              order_ids: chunk,
            }),
          }
        );
        const data2 = await response2.json();
        console.log(
          `Результат чанка для Client-Id ${clientId} (размер чанка: ${chunk.length}):`,
          JSON.stringify(data2)
        );

        // Объединяем результаты из разных чанков
        if (data2.orders) {
          allResults.orders.push(...data2.orders);
        }
      }

      // Запись поставок в БД
      for (const order of allResults.orders) {
        const orderNumber = order.order_number;
        console.log(`Обрабатываем поставку: ${orderNumber}, order_id: ${order.order_id}`);
        try {
          const existingOrder = await dbAllAsync('SELECT * FROM ozon_orders WHERE id = ?', [String(order.order_id)]);
          console.log(`Проверка существования: найдено ${existingOrder.length} записей для order_id ${String(order.order_id)}`);

          const slot = order.timeslot?.timeslot ? JSON.stringify({
            dateFrom: order.timeslot.timeslot.from,
            dateTo: order.timeslot.timeslot.to
          }) : null;
          console.log(`Сформированный slot: ${slot}`);

          if (existingOrder.length === 0) {
            // Новая поставка - вставляем
            console.log(`Подготавливаемся вставить новую поставку: ${order.order_number}, userId: ${userId}, ozonPersonalAccountId: ${ozonPersonalAccountId}`);
            console.log(`Параметры вставки: [${String(order.order_id)}, ${ozonPersonalAccountId}, ${userId}, ${slot}, ${order.state}, ${order.order_number}, null, ${order.drop_off_warehouse?.name || null}, []]`);

            const insertResult = await dbRunAsync(
              `INSERT INTO ozon_orders (id, ozon_personal_account_id, user_id, slot, status, order_number, cluster_name, stock_name, convenient_slot) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                String(order.order_id),
                ozonPersonalAccountId,
                userId,
                slot,
                order.state,
                order.order_number,
                null, // cluster_name
                order.drop_off_warehouse?.name || null, // stock_name
                JSON.stringify([]) // convenient_slot
              ]
            );

            console.log(`Результат вставки:`, insertResult);
            console.log(`Вставлена новая поставка: ${order.order_number}`);
          } else {
            console.log(`Поставка ${order.order_number} уже существует, проверяем slot`);
            // Проверяем, изменился ли timeslot
            const existingSlot = existingOrder[0].slot;
            console.log(`Существующий slot: "${existingSlot}" vs новый: "${slot}"`);
            if (existingSlot !== slot) {
              // Обновляем только slot и status если изменился slot
              const updateResult = await dbRunAsync(
                `UPDATE ozon_orders SET slot = ?, status = ? WHERE id = ?`,
                [slot, order.state, String(order.order_id)]
              );
              console.log(`Результат обновления slot:`, updateResult);
              console.log(`Обновлен slot для поставки: ${order.order_number}`);
            } else {
              console.log(`Slot не изменился для поставки: ${order.order_number}, пропускаем обновление`);
            }
          }
        } catch (error) {
          console.error(`Ошибка обработки поставки ${orderNumber}:`, error.message);
          console.error(`Полная ошибка:`, error);
        }
      }

      console.log(
        `Для Client-Id ${clientId} обработано ${allResults.orders.length} поставок`
      );
    } else {
      console.log(`Для Client-Id ${clientId} нет поставок для обработки.`);
    }
  } catch (error) {
    console.error(
      `Ошибка при выполнении запроса к Ozon API для Client-Id ${clientId}:`,
      error.message
    );
  }
}

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

// Настраиваем cron-задачу: каждые 20 минут (*/10 * * * *)
cron.schedule('*/10 * * * *', () => {
  console.log('Запуск периодической задачи (каждые 10 минут)');
  makeOzonRequest();
});

// Middleware
app.use((req, res, next) => {
  next();
});
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
