const express = require('express');

const router = express.Router();

// Генератор случайных строк
function generateRandomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Генератор случайных чисел в диапазоне
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Генератор случайных дат в будущем
function generateRandomFutureDate(daysOffset = 0) {
  const now = new Date();
  now.setDate(now.getDate() + getRandomInt(daysOffset, daysOffset + 7));
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}.${String(now.getMilliseconds()).padStart(3, '0')}`;
  return `${month}/${day}/${year}T${time}`;
}

// Списки данных для генерации
const statuses = ['Заполнение данных', 'Готов к отгрузке', 'В пути', 'Доставлен', 'Отменён'];
const clusters = [
  'Москва, Центр',
  'Москва, Запад',
  'Москва, Восток',
  'Москва, Север',
  'Москва, Юг',
  'СПб, Центр',
  'СПб, Север',
  'СПб, Юг'
];
const stocks = [
  'ПВЗ ООО Ромашка',
  'ПВЗ ООО Одуванчики',
  'ПВЗ ИП Иванова',
  'ПВЗ ООО Лотос',
  'ПВЗ ООО Тюльпан',
  'ПВЗ ООО Василёк',
  'ПВЗ ООО Фиалка',
  'ПВЗ ООО Незабудка'
];

// Функция генерации одного supply
function generateSupply(index) {
  const id = generateRandomString(12);
  const baseOrderId = getRandomInt(20000000, 30000000);
  const orderId = `${baseOrderId}-${index + 1}`;
  const supplyNumber = String(getRandomInt(1000, 999999));
  const clusterIndex = getRandomInt(0, clusters.length - 1);
  const stockIndex = getRandomInt(0, stocks.length - 1);
  const statusIndex = getRandomInt(0, statuses.length - 1);
  const clusterName = clusters[clusterIndex];
  const stockName = stocks[stockIndex];
  const status = statuses[statusIndex];

  // Генерируем последовательные даты для слотов
  const slotDateFrom = generateRandomFutureDate(1);
  const slotDateTo = generateRandomFutureDate(2);

  const convenientDateFrom1 = generateRandomFutureDate(3);
  const convenientDateTo1 = generateRandomFutureDate(4);
  const convenientDateFrom2 = generateRandomFutureDate(5);
  const convenientDateTo2 = generateRandomFutureDate(6);

  const isChecked = Math.random() > 0.5;


  return {
    id,
    orderId,
    slot: {
      dateFrom: slotDateFrom,
      dateTo: slotDateTo,
    },
    supplyNumber,
    clusterNme: clusterName, // Сохраняем опечатку для совместимости
    stockName,
    status,
    convenientSlot: isChecked ? [
      {
        dateFrom: convenientDateFrom1,
        dateTo: convenientDateTo1,
      },
      {
        dateFrom: convenientDateFrom2,
        dateTo: convenientDateTo2,
      },
    ] : [],
  };
}

router.get('/', async (req, res) => {
  // Генерируем случайное количество supplies от 5 до 15
  const count = getRandomInt(5, 15);
  const supplies = Array.from({ length: count }, (_, index) => generateSupply(index));


  res.jsonp(supplies);
});

module.exports = router;
