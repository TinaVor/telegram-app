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

    // Проверяем, активна ли подписка (есть ли остатки проверок)
    const isActive = subscription.remaining_checks > 0;

    res.json({
      subscription: {
        ...subscription,
        is_active: isActive,
        remaining_checks: subscription.remaining_checks
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
    const { plan_type } = req.body; // 'basic' (10 проверок) или 'premium' (30 проверок)
    const userId = req.user.id;

    if (!plan_type || !['basic', 'premium'].includes(plan_type)) {
      return res.status(400).json({ message: 'Неверный тип подписки' });
    }

    // Рассчитываем количество проверок
    let remainingChecks = 0;
    if (plan_type === 'basic') {
      remainingChecks = 10; // 10 проверок
    } else if (plan_type === 'premium') {
      remainingChecks = 30; // 30 проверок
    }

    // Проверяем, есть ли уже подписка у пользователя
    const existingSubscriptions = await dbAllAsync(
      'SELECT * FROM subscriptions WHERE user_id = ?',
      [userId]
    );

    if (existingSubscriptions.length > 0) {
      // Обновляем существующую подписку - добавляем проверки
      const subscription = existingSubscriptions[0];
      const newRemainingChecks = subscription.remaining_checks + remainingChecks;
      
      await dbRunAsync(
        'UPDATE subscriptions SET remaining_checks = ?, status = ? WHERE id = ?',
        [newRemainingChecks, 'active', subscription.id]
      );

      res.json({
        message: 'Подписка успешно обновлена',
        subscription: {
          id: subscription.id,
          remaining_checks: newRemainingChecks,
          status: 'active',
          plan_type: plan_type
        }
      });
    } else {
      // Создаем новую подписку
      const subscriptionId = randomUUID();
      await dbRunAsync(
        'INSERT INTO subscriptions (id, user_id, status, remaining_checks) VALUES (?, ?, ?, ?)',
        [subscriptionId, userId, 'active', remainingChecks]
      );

      res.json({
        message: 'Подписка успешно создана',
        subscription: {
          id: subscriptionId,
          remaining_checks: remainingChecks,
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
        remaining_checks: 0,
        message: 'Подписка не найдена'
      });
    }

    const subscription = subscriptions[0];
    const isActive = subscription.remaining_checks > 0;

    res.json({
      has_subscription: true,
      is_active: isActive,
      remaining_checks: subscription.remaining_checks
    });
  } catch (error) {
    console.error('Error checking subscription status:', error);
    res.status(500).json({ message: 'Ошибка при проверке статуса подписки' });
  }
});

// Использовать одну проверку
router.post('/use-check', authMiddleware, async (req, res) => {
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

    if (subscription.remaining_checks <= 0) {
      return res.status(400).json({ 
        message: 'Недостаточно проверок',
        remaining_checks: 0
      });
    }

    // Используем одну проверку
    const newRemainingChecks = subscription.remaining_checks - 1;
    await dbRunAsync(
      'UPDATE subscriptions SET remaining_checks = ? WHERE id = ?',
      [newRemainingChecks, subscription.id]
    );

    res.json({
      message: 'Проверка использована',
      remaining_checks: newRemainingChecks
    });
  } catch (error) {
    console.error('Error using subscription check:', error);
    res.status(500).json({ message: 'Ошибка при использовании проверки' });
  }
});

module.exports = router;
