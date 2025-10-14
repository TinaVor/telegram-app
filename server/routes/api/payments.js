const express = require('express');
const { randomUUID } = require('crypto');
const { db, dbAllAsync, dbRunAsync } = require('../../db');
const { authenticateToken } = require('../../middleware/auth');
const axios = require('axios');
const router = express.Router();

// Базовый URL для API ЮКассы
const YOOKASSA_API_URL = 'https://api.yookassa.ru/v3';

// Функция для создания HTTP клиента с аутентификацией
const createYookassaClient = () => {
  const shopId = process.env.YOOKASSA_SHOP_ID;
  const secretKey = process.env.YOOKASSA_SECRET_KEY;
  
  if (!shopId || !secretKey) {
    throw new Error('YOOKASSA_SHOP_ID and YOOKASSA_SECRET_KEY are required');
  }

  return axios.create({
    baseURL: YOOKASSA_API_URL,
    auth: {
      username: shopId,
      password: secretKey
    },
    headers: {
      'Idempotence-Key': randomUUID()
    }
  });
};

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

    // Создаем платеж в ЮКассе через API
    const yookassaClient = createYookassaClient();
    
    // Формируем return_url в зависимости от окружения
    let returnUrl;
    if (process.env.NODE_ENV === 'production') {
      returnUrl = `${process.env.YOOKASSA_WEBHOOK_URL || 'https://your-app.onrender.com'}/payment-success`;
    } else {
      returnUrl = `${process.env.YOOKASSA_WEBHOOK_URL || 'http://localhost:3001'}/payment-success`;
    }

    const paymentData = {
      amount: {
        value: (paymentAmount / 100).toFixed(2),
        currency: 'RUB'
      },
      confirmation: {
        type: 'redirect',
        return_url: returnUrl
      },
      description: plan_type === 'basic' ? 'Подписка на 30 слотов' : 'Подписка на 90 слотов',
      metadata: {
        payment_id: paymentId,
        user_id: userId,
        plan_type: plan_type
      },
      capture: true
    };

    console.log('Creating payment with data:', JSON.stringify(paymentData, null, 2));
    console.log('YOOKASSA_SHOP_ID exists:', !!process.env.YOOKASSA_SHOP_ID);
    console.log('YOOKASSA_SECRET_KEY exists:', !!process.env.YOOKASSA_SECRET_KEY);
    console.log('YOOKASSA_WEBHOOK_URL:', process.env.YOOKASSA_WEBHOOK_URL);

    const response = await yookassaClient.post('/payments', paymentData);
    const payment = response.data;
    
    console.log('YooKassa API response:', JSON.stringify(payment, null, 2));

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
    console.error('Error creating payment:');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Error response status:', error.response.status);
      console.error('Error response data:', JSON.stringify(error.response.data, null, 2));
      console.error('Error response headers:', error.response.headers);
      
      // Return more specific error message based on YooKassa response
      if (error.response.status === 401) {
        return res.status(500).json({ message: 'Ошибка аутентификации с ЮКассой. Проверьте SHOP_ID и SECRET_KEY' });
      } else if (error.response.status === 402) {
        return res.status(500).json({ message: 'Ошибка оплаты. Проверьте данные платежа' });
      } else if (error.response.status === 400) {
        return res.status(500).json({ message: 'Неверный запрос к ЮКассе: ' + (error.response.data.description || 'проверьте данные') });
      }
    } else if (error.request) {
      // The request was made but no response was received
      console.error('Error request:', error.request);
      return res.status(500).json({ message: 'Нет ответа от сервера ЮКассы. Проверьте подключение к интернету' });
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error config:', error.config);
    }
    
    console.error('Error stack:', error.stack);
    res.status(500).json({ message: 'Ошибка при создании платежа: ' + error.message });
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
