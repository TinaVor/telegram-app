const { db, dbAllAsync, dbRunAsync } = require('./db');

// Функция для очистки всех заказов из таблицы ozon_orders
async function cleanAllOzonOrders() {
  try {
    console.log('Начинаем очистку всех заказов Ozon...');
    const result = await dbRunAsync('DELETE FROM ozon_orders');
    console.log(`Удалено ${result.changes} заказов из таблицы ozon_orders`);
    return result;
  } catch (error) {
    console.error('Ошибка при очистке заказов Ozon:', error);
    throw error;
  }
}

module.exports = {
  cleanAllOzonOrders
};
