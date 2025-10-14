const express = require('express');
const { randomUUID } = require('crypto');
const { db, dbAllAsync, dbRunAsync } = require('../../db');
const { authenticateToken } = require('../../middleware/auth');
const { YandexCheckout } = require('yookassa');
const router = express.Router();

// Инициализация ЮКассы
const yookassa = new YandexCheckout({
  shopId: process.env.YOOKASSA_SHOP_ID,
  secretKey: process.env.YOOKASSA_SECRET_KEY
});

// Создать платеж в ЮКассе
router.post('/create', authenticateToken, async (req, res) => {
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

    // Создаем платеж в ЮКассе
    const payment = await yookassa.createPayment({
      amount: {
        value: (paymentAmount / 100).toFixed(2),
        currency: 'RUB'
      },
      payment_method_data: {
        type: 'bank_card'
      },
      confirmation: {
        type: 'redirect',
        return_url: `${process.env.YOOKASSA_WEBHOOK_URL}/payment-success`
      },
      description: plan_type === 'basic' ? '30 слотов' : '90 слотов',
      metadata: {
        payment_id: paymentId,
        user_id: userId,
        plan_type: plan_type
      }
    }, paymentId);

    // Обновляем ID платежа в базе на ID из ЮКассы
    await dbRunAsync(
      'UPDATE payments SET id = ? WHERE id = ?',
      [payment.id, paymentId]
    );

    res.json({
      message: 'Платеж создан',
      payment: {
        id: payment.id,
        status: payment.status,
        confirmation: payment.confirmation,
        amount: payment.amount,
        description: payment.description
      }
    });
  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).json({ message: 'Ошибка при создании платежа' });
  }
});

// Получить статус платежа
router.get('/:paymentId/status', authenticateToken, async (req, res) => {
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

// Вебхук для обработки уведомлений от ЮКассы
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const event = req.body;
    
    // Проверяем тип события
    if (event.type === 'notification' && event.event === 'payment.succeeded') {
      const payment = event.object;
      
      // Находим платеж в базе по ID из ЮКассы
      const payments = await dbAllAsync(
        'SELECT * FROM payments WHERE id = ?',
        [payment.id]
      );

      if (payments.length === 0) {
        console.error('Payment not found in database:', payment.id);
        return res.status(404).json({ message: 'Платеж не найден' });
      }

      const dbPayment = payments[0];

      // Если платеж уже обработан, ничего не делаем
      if (dbPayment.status === 'succeeded') {
        return res.json({ message: 'Платеж уже обработан' });
      }

      // Обновляем статус платежа
      await dbRunAsync(
        'UPDATE payments SET status = ? WHERE id = ?',
        ['succeeded', payment.id]
      );

      // Получаем данные из метаданных
      const userId = dbPayment.user_id;
      const planType = dbPayment.plan_type;

      // Рассчитываем количество слотов
      let slotsToAdd = 0;
      if (planType === 'basic') {
        slotsToAdd = 30; // 30 слотов
      } else if (planType === 'premium') {
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

      console.log('Payment processed successfully:', payment.id);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ message: 'Ошибка при обработке вебхука' });
  }
});

module.exports = router;
