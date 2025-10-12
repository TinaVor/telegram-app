const express = require('express');
const path = require('path');
const cron = require('node-cron');
const https = require('https');

// Initialize database
require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

// Функция для выполнения запроса к Ozon API
async function makeOzonRequest() {
  try {
    console.log('Выполняем запрос к Ozon API...');

    const response = await fetch(
      'https://api-seller.ozon.ru/v3/supply-order/list',
      {
        method: 'POST',
        headers: {
          'Client-Id': '23',
          'Api-Key': 'e34',
        },
        body: { date_from: '2025-03-01', date_to: '2025-03-30', limit: 500 },
      }
    );

    const data = await response.json();
    console.log('Результат запроса к Ozon API:', data);
  } catch (error) {
    console.error('Ошибка при выполнении запроса к Ozon API:', error.message);
  }
}

// Настраиваем cron-задачу: каждые 10 минут (*/10 * * * *)
cron.schedule('*/5 * * * * *', () => {
  console.log('Запуск периодической задачи (каждые 10 минут)');
  // makeOzonRequest();
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
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
