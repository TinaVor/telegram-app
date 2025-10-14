const express = require('express');
const { randomUUID } = require('crypto');
const { db, dbAllAsync, dbRunAsync } = require('../../db');
const authMiddleware = require('../../middleware/auth');

const router = express.Router();

// Создать платеж в ЮКассе
router.post('/create', authMiddleware, async (req, res) => {
  try {
    const { plan_type, amount } = req.body;
    const userId = req.user.id;

    if (!plan_type || !['basic', 'premium'].includes(plan_type)) {
      return res.status(400).json({ message: 'Неверный тип подписки' });
    }

    // Рассчитываем сумму платежа
    const paymentAmount = plan_type === 'basic' ? 30000 : 80000; // в копейках (300 руб и 800 руб)

    // Создаем запись о платеже в базе
    const paymentId = randomUUID();
    await dbRunAsync(
      'INSERT INTO payments (id, user_id, amount, plan_type, status) VALUES (?, ?, ?, ?, ?)',
      [paymentId, userId, paymentAmount, plan_type, 'pending']
    );

    // В реальном приложении здесь был бы вызов API ЮКассы
    // Для демонстрации имитируем создание платежа
    const paymentData = {
      id: paymentId,
      status: 'pending',
      confirmation: {
        type: 'redirect',
        confirmation_url: `http://localhost:5177/payment-confirm?payment_id=${paymentId}`
      },
      amount: {
        value: (paymentAmount / 100).toFixed(2),
        currency: 'RUB'
      },
      description: plan_type === 'basic' ? '30 слотов' : '90 слотов'
    };

    res.json({
      message: 'Платеж создан',
      payment: paymentData
    });
  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).json({ message: 'Ошибка при создании платежа' });
  }
});

// Получить статус платежа
router.get('/:paymentId/status', authMiddleware, async (req, res) => {
  try {
    const { paymentId } = req.params;
    const userId = req.user.id;

    const payments = await dbAllAsync(
      'SELECT * FROM payments WHERE id = ? AND user_id = ?',
      [paymentId, userId]
    );

    if (payments.length === 0) {
      return res.status(404).json({ message: 'Платеж не найден' });
    }

    const payment = payments[0];
    res.json({
      payment: {
        id: payment.id,
        status: payment.status,
        amount: payment.amount / 100,
        plan_type: payment.plan_type
      }
    });
  } catch (error) {
    console.error('Error getting payment status:', error);
    res.status(500).json({ message: 'Ошибка при получении статуса платежа' });
  }
});

// Подтвердить платеж (имитация вебхука от ЮКассы)
router.post('/:paymentId/confirm', authMiddleware, async (req, res) => {
  try {
    const { paymentId } = req.params;
    const userId = req.user.id;

    const payments = await dbAllAsync(
      'SELECT * FROM payments WHERE id = ? AND user_id = ?',
      [paymentId, userId]
    );

    if (payments.length === 0) {
      return res.status(404).json({ message: 'Платеж не найден' });
    }

    const payment = payments[0];

    if (payment.status === 'succeeded') {
      return res.json({ message: 'Платеж уже подтвержден' });
    }

    // Обновляем статус платежа
    await dbRunAsync(
      'UPDATE payments SET status = ? WHERE id = ?',
      ['succeeded', paymentId]
    );

    // Рассчитываем количество слотов
    let slotsToAdd = 0;
    if (payment.plan_type === 'basic') {
      slotsToAdd = 30; // 30 слотов
    } else if (payment.plan_type === 'premium') {
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
        'UPDATE subscriptions SET remaining_slots = ?, status = ? WHERE user_id = ?',
        [newRemainingSlots, 'active', userId]
      );
    } else {
      // Создаем новую подписку
      const subscriptionId = randomUUID();
      await dbRunAsync(
        'INSERT INTO subscriptions (id, user_id, status, remaining_slots) VALUES (?, ?, ?, ?)',
        [subscriptionId, userId, 'active', slotsToAdd]
      );
    }

    res.json({
      message: 'Платеж подтвержден и подписка активирована',
      payment: {
        id: payment.id,
        status: 'succeeded',
        plan_type: payment.plan_type
      }
    });
  } catch (error) {
    console.error('Error confirming payment:', error);
    res.status(500).json({ message: 'Ошибка при подтверждении платежа' });
  }
});

module.exports = router;
