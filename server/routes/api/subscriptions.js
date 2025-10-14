const express = require('express');
const { randomUUID } = require('crypto');
const { db, dbAllAsync, dbRunAsync } = require('../../db');
const authMiddleware = require('../../middleware/auth');

const router = express.Router();

// Получить подписку текущего пользователя
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const subscriptions = await dbAllAsync(
      'SELECT * FROM subscriptions WHERE user_id = ?',
      [userId]
    );

    if (subscriptions.length === 0) {
      return res.json({ 
        subscription: null,
        message: 'Подписка не найдена'
      });
    }

    const subscription = subscriptions[0];

    // Проверяем, активна ли подписка (есть ли остатки слотов)
    const isActive = subscription.remaining_slots > 0;

    res.json({
      subscription: {
        ...subscription,
        is_active: isActive,
        remaining_slots: subscription.remaining_slots
      }
    });
  } catch (error) {
    console.error('Error getting subscription:', error);
    res.status(500).json({ message: 'Ошибка при получении подписки' });
  }
});

// Создать или обновить подписку
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { plan_type } = req.body; // 'basic' (30 слотов) или 'premium' (90 слотов)
    const userId = req.user.id;

    if (!plan_type || !['basic', 'premium'].includes(plan_type)) {
      return res.status(400).json({ message: 'Неверный тип подписки' });
    }

    // Рассчитываем количество слотов
    let slotsToAdd = 0;
    if (plan_type === 'basic') {
      slotsToAdd = 30; // 30 слотов
    } else if (plan_type === 'premium') {
      slotsToAdd = 90; // 90 слотов
    }

    // Проверяем, есть ли уже подписка у пользователя
    const existingSubscriptions = await dbAllAsync(
      'SELECT * FROM subscriptions WHERE user_id = ?',
      [userId]
    );

    if (existingSubscriptions.length > 0) {
      // Обновляем существующую подписку - добавляем слоты
      const subscription = existingSubscriptions[0];
      const newRemainingSlots = subscription.remaining_slots + slotsToAdd;
      
      await dbRunAsync(
        'UPDATE subscriptions SET remaining_slots = ?, status = ? WHERE id = ?',
        [newRemainingSlots, 'active', subscription.id]
      );

      res.json({
        message: 'Подписка успешно обновлена',
        subscription: {
          id: subscription.id,
          remaining_slots: newRemainingSlots,
          status: 'active',
          plan_type: plan_type
        }
      });
    } else {
      // Создаем новую подписку
      const subscriptionId = randomUUID();
      await dbRunAsync(
        'INSERT INTO subscriptions (id, user_id, status, remaining_slots) VALUES (?, ?, ?, ?)',
        [subscriptionId, userId, 'active', slotsToAdd]
      );

      res.json({
        message: 'Подписка успешно создана',
        subscription: {
          id: subscriptionId,
          remaining_slots: slotsToAdd,
          status: 'active',
          plan_type: plan_type
        }
      });
    }
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({ message: 'Ошибка при создании подписки' });
  }
});

// Проверить статус подписки
router.get('/status', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const subscriptions = await dbAllAsync(
      'SELECT * FROM subscriptions WHERE user_id = ?',
      [userId]
    );

    if (subscriptions.length === 0) {
      return res.json({ 
        has_subscription: false,
        is_active: false,
        remaining_slots: 0,
        message: 'Подписка не найдена'
      });
    }

    const subscription = subscriptions[0];
    const isActive = subscription.remaining_slots > 0;

    res.json({
      has_subscription: true,
      is_active: isActive,
      remaining_slots: subscription.remaining_slots
    });
  } catch (error) {
    console.error('Error checking subscription status:', error);
    res.status(500).json({ message: 'Ошибка при проверке статуса подписки' });
  }
});

// Использовать один слот
router.post('/use-slot', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const subscriptions = await dbAllAsync(
      'SELECT * FROM subscriptions WHERE user_id = ?',
      [userId]
    );

    if (subscriptions.length === 0) {
      return res.status(400).json({ 
        message: 'Подписка не найдена',
        has_subscription: false
      });
    }

    const subscription = subscriptions[0];

    if (subscription.remaining_slots <= 0) {
      return res.status(400).json({ 
        message: 'Недостаточно слотов',
        remaining_slots: 0
      });
    }

    // Используем один слот
    const newRemainingSlots = subscription.remaining_slots - 1;
    await dbRunAsync(
      'UPDATE subscriptions SET remaining_slots = ? WHERE id = ?',
      [newRemainingSlots, subscription.id]
    );

    res.json({
      message: 'Слот использован',
      remaining_slots: newRemainingSlots
    });
  } catch (error) {
    console.error('Error using subscription slot:', error);
    res.status(500).json({ message: 'Ошибка при использовании слота' });
  }
});

module.exports = router;
