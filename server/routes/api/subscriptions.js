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
    const now = new Date();
    const expiredDate = new Date(subscription.expired_date);

    // Проверяем, активна ли подписка
    const isActive = expiredDate > now;

    res.json({
      subscription: {
        ...subscription,
        is_active: isActive,
        days_remaining: Math.ceil((expiredDate - now) / (1000 * 60 * 60 * 24))
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
    const { plan_type } = req.body; // 'basic' (1 месяц) или 'premium' (3 месяца)
    const userId = req.user.id;

    if (!plan_type || !['basic', 'premium'].includes(plan_type)) {
      return res.status(400).json({ message: 'Неверный тип подписки' });
    }

    // Рассчитываем дату истечения подписки
    const now = new Date();
    const expiredDate = new Date();
    
    if (plan_type === 'basic') {
      // 1 месяц = 30 дней
      expiredDate.setDate(now.getDate() + 30);
    } else if (plan_type === 'premium') {
      // 3 месяца = 120 дней (примерно 4 месяца)
      expiredDate.setDate(now.getDate() + 120);
    }

    const expiredDateStr = expiredDate.toISOString();

    // Проверяем, есть ли уже подписка у пользователя
    const existingSubscriptions = await dbAllAsync(
      'SELECT * FROM subscriptions WHERE user_id = ?',
      [userId]
    );

    if (existingSubscriptions.length > 0) {
      // Обновляем существующую подписку
      const subscription = existingSubscriptions[0];
      await dbRunAsync(
        'UPDATE subscriptions SET expired_date = ?, status = ? WHERE id = ?',
        [expiredDateStr, 'active', subscription.id]
      );

      res.json({
        message: 'Подписка успешно обновлена',
        subscription: {
          id: subscription.id,
          expired_date: expiredDateStr,
          status: 'active',
          plan_type: plan_type
        }
      });
    } else {
      // Создаем новую подписку
      const subscriptionId = randomUUID();
      await dbRunAsync(
        'INSERT INTO subscriptions (id, user_id, status, expired_date) VALUES (?, ?, ?, ?)',
        [subscriptionId, userId, 'active', expiredDateStr]
      );

      res.json({
        message: 'Подписка успешно создана',
        subscription: {
          id: subscriptionId,
          expired_date: expiredDateStr,
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
        message: 'Подписка не найдена'
      });
    }

    const subscription = subscriptions[0];
    const now = new Date();
    const expiredDate = new Date(subscription.expired_date);
    const isActive = expiredDate > now;

    res.json({
      has_subscription: true,
      is_active: isActive,
      expired_date: subscription.expired_date,
      days_remaining: isActive ? Math.ceil((expiredDate - now) / (1000 * 60 * 60 * 24)) : 0
    });
  } catch (error) {
    console.error('Error checking subscription status:', error);
    res.status(500).json({ message: 'Ошибка при проверке статуса подписки' });
  }
});

module.exports = router;
