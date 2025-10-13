const express = require('express');
const { authenticateToken } = require('../../middleware/auth');
const { db } = require('../../db');

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  const userId = req.user.id;

  // Запрос к БД для получения ozon_orders для текущего пользователя
  db.all(
    'SELECT id, slot, status, order_number, cluster_name, stock_name, convenient_slot, client_id, isSlotFixed FROM ozon_orders WHERE user_id = ?',
    [userId],
    (err, rows) => {
      if (err) {
        console.error('Error fetching ozon orders:', err);
        return res.status(500).json({ message: 'Failed to fetch orders' });
      }

      // Преобразуем данные в нужный формат
      const supplies = rows.map((row) => {
        let slot = null;
        let convenientSlot = [];

        // Парсим slot как JSON, если есть
        if (row.slot) {
          try {
            slot = JSON.parse(row.slot);
          } catch (e) {
            console.error('Error parsing slot JSON:', e);
            slot = null;
          }
        }

        // Парсим convenient_slot как JSON, если есть
        if (row.convenient_slot) {
          try {
            convenientSlot = JSON.parse(row.convenient_slot);
          } catch (e) {
            console.error('Error parsing convenient_slot JSON:', e);
            convenientSlot = [];
          }
        }

        return {
          id: row.id,
          orderId: row.id, // Используем id как orderId
          slot: slot,
          orderNumber: row.order_number,
          clusterName: row.cluster_name,
          stockName: row.stock_name,
          status: row.status,
          convenientSlot: convenientSlot,
          isSlotFixed: row.isSlotFixed === 1,
        };
      });

      res.jsonp(supplies);
    }
  );
});

module.exports = router;
