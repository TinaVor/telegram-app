const express = require('express');
const { authenticateToken } = require('../../middleware/auth');
const { db } = require('../../db');

const router = express.Router();

// POST /ozon-order/book-slot
router.post('/book-slot', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { orderId, slots } = req.body;

  if (!orderId || !Array.isArray(slots)) {
    return res.status(400).json({ message: 'Invalid request data' });
  }

  try {
    // читаем существующий запис витамишов
    db.get('SELECT convenient_slot FROM ozon_orders WHERE id = ? AND user_id = ?', [orderId, userId], (err, row) => {
      if (err) {
        console.error('Error fetching order:', err);
        return res.status(500).json({ message: 'Failed to fetch order' });
      }

      if (!row) {
        return res.status(404).json({ message: 'Order not found' });
      }

      // Обновляем convenient_slot и сбрасываем isSlotFixed при изменении слотов
      db.run(
        'UPDATE ozon_orders SET convenient_slot = ?, isSlotFixed = 0 WHERE id = ? AND user_id = ?',
        [JSON.stringify(slots), orderId, userId],
        function (err) {
          if (err) {
            console.error('Error updating order:', err);
            return res.status(500).json({ message: 'Failed to book slot' });
          }

          res.json({ message: 'Slot booked successfully' });
        }
      );
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
