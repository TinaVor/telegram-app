const { supabase, db, dbAllAsync, dbRunAsync } = require('./db');

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
            dateFrom: order.timeslot?.timeslot?.from,
            dateTo: order.timeslot?.timeslot?.to
          }) : null;
          console.log(`Сформированный slot: ${slot}`);

          if (existingOrder.length === 0) {
            // Новая поставка - вставляем
            console.log(`Подготавливаемся вставить новую поставку: ${order.order_number}, userId: ${userId}, ozonPersonalAccountId: ${ozonPersonalAccountId}`);
            console.log(`Параметры вставки: [${String(order.order_id)}, ${ozonPersonalAccountId}, ${userId}, ${slot}, ${order.state}, ${order.order_number}, null, ${order.drop_off_warehouse?.name || null}, []]`);

            const insertResult = await dbRunAsync(
              `INSERT INTO ozon_orders (id, ozon_personal_account_id, client_id, user_id, slot, status, order_number, cluster_name, stock_name, convenient_slot) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                String(order.order_id),
                ozonPersonalAccountId,
                clientId, // client_id
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

// Функция для проверки и фиксации слотов
async function checkSlotsForFixing() {
  try {
    console.log('Начинаем проверку слотов для фиксации...');

    // Получаем все поставки пользователей с активными подписками, где convenient_slot не пустой и isSlotFixed = 0 или null
    const sql = `
      SELECT DISTINCT ozon_orders.id, ozon_orders.convenient_slot, ozon_orders.slot, ozon_orders.client_id, ozon_orders.isSlotFixed,
                     ozon_orders.ozon_personal_account_id, ozon_personal_accounts.client_id as account_client_id, ozon_personal_accounts.api_key
      FROM ozon_orders
      JOIN ozon_personal_accounts ON ozon_orders.ozon_personal_account_id = ozon_personal_accounts.id
      JOIN users ON ozon_orders.user_id = users.id
      JOIN subscriptions ON users.id = subscriptions.user_id
      WHERE subscriptions.status = 'active'
        AND ozon_orders.convenient_slot IS NOT NULL
        AND ozon_orders.convenient_slot != '[]'
        AND (ozon_orders.isSlotFixed IS NULL OR ozon_orders.isSlotFixed = 0)
    `;

    const ordersToCheck = await dbAllAsync(sql, []);

    console.log(`Найдено ${ordersToCheck.length} поставок для проверки слотов`);

    for (const order of ordersToCheck) {
      try {
        console.log(`Проверяем поставку ${order.id}`);

        // Парсим convenient_slot
        let convenientSlots = [];
        try {
          convenientSlots = JSON.parse(order.convenient_slot);
        } catch (e) {
          console.error(`Ошибка парсинга convenient_slot для поставки ${order.id}:`, e);
          continue;
        }

        if (!convenientSlots.length) continue;

        // Отправляем запрос на получение доступных слотов
        const response = await fetch('https://api-seller.ozon.ru/v1/supply-order/timeslot/get', {
          method: 'POST',
          headers: {
            'Client-Id': order.account_client_id,
            'Api-Key': order.api_key,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            supply_order_id: order.id
          })
        });

        const data = await response.json();

        if (!response.ok) {
          console.error(`Ошибка при запросе слотов для поставки ${order.id}:`, data);
          continue;
        }

        const availableTimeslots = data?.timeslots || [];
        console.log(`Доступные слоты для поставки ${order.id}:`, availableTimeslots);

        // Ищем подходящий слот: ближайший по возрастанию 1-часовой интервал в пересечении convenient_slot и availableTimeslots
        let selectedSlot = null;
        let minIntersectFrom = Infinity;

        for (const availableSlot of availableTimeslots) {
          const availFrom = new Date(availableSlot.from).getTime();
          const availTo = new Date(availableSlot.to).getTime();

          for (const convenientSlot of convenientSlots) {
            const convFrom = new Date(convenientSlot.dateFrom).getTime();
            const convTo = new Date(convenientSlot.dateTo).getTime();

            // Вычисляем пересечение интервалов
            const intersectFrom = Math.max(convFrom, availFrom);
            const intersectTo = Math.min(convTo, availTo);

            // Если пересечение >= 1 часа
            if (intersectTo - intersectFrom >= 3600000) { // 1 час = 3600000 ms
              const proposedTo = intersectFrom + 3600000;
              // Предлагаемый интервал: [intersectFrom, intersectFrom + 1 час] должен полностью входить в пересечение
              if (proposedTo <= intersectTo && intersectFrom < minIntersectFrom) {
                minIntersectFrom = intersectFrom;
                selectedSlot = {
                  from: new Date(intersectFrom).toISOString().replace('Z', '+00:00'),
                  to: new Date(proposedTo).toISOString().replace('Z', '+00:00')
                };
              }
            }
          }
        }

        if (selectedSlot) {
          console.log(`Найден подходящий слот для поставки ${order.id}: ${JSON.stringify(selectedSlot)}`);

          // Отправляем запрос на обновление timeslot
          const updateResponse = await fetch('https://api-seller.ozon.ru/v1/supply-order/timeslot/update', {
            method: 'POST',
            headers: {
              'Client-Id': order.account_client_id,
              'Api-Key': order.api_key,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              supply_order_id: order.id,
              timeslot: selectedSlot
            })
          });

          if (updateResponse.ok) {
            // Обновляем isSlotFixed = 1 только после успешного ответа от бэка
            await dbRunAsync('UPDATE ozon_orders SET isSlotFixed = 1 WHERE id = ?', [order.id]);
            console.log(`Установлен isSlotFixed = 1 для поставки ${order.id}`);
          } else {
            console.log(`Не удалось обновить timeslot для поставки ${order.id}, код ответа: ${updateResponse.status}. Попытка будет повторена позже.`);
          }
        }

      } catch (error) {
        console.error(`Ошибка при обработке поставки ${order.id}:`, error.message);
      }
    }

    console.log('Проверка слотов завершена');

  } catch (error) {
    console.error('Ошибка в функции checkSlotsForFixing:', error.message);
  }
}

module.exports = {
  makeOzonRequestForAccount,
  checkSlotsForFixing
};
