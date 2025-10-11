// server/index.js
const express = require('express');
const path = require('path');
const { createHmac } = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../client/dist')));

// Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// ЮKassa
const YOOKASSA_SHOP_ID = process.env.YOOKASSA_SHOP_ID;
const YOOKASSA_SECRET_KEY = process.env.YOOKASSA_SECRET_KEY;
const YOOKASSA_WEBHOOK_URL = process.env.YOOKASSA_WEBHOOK_URL;

// Базовая авторизация для ЮKassa webhook
const basicAuth = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).end();
  // ЮKassa не требует auth, но можно добавить IP-фильтр позже
  next();
};

// === 1. Авторизация + проверка подписки ===
app.post('/api/auth', async (req, res) => {
  const { initData } = req.body;
  if (!initData) return res.status(400).json({ error: 'initData required' });

  // Проверка подписи Telegram
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const SECRET_KEY = createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return res.status(401).json({ error: 'Invalid' });

  params.delete('hash');
  const checkString = Array.from(params.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
  const calcHash = createHmac('sha256', SECRET_KEY).update(checkString).digest('hex');
  if (hash !== calcHash) return res.status(401).json({ error: 'Invalid signature' });

  const user = JSON.parse(params.get('user'));
  const telegramId = String(user.id);

  // Найти или создать пользователя
  let {  dbUser } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_id', telegramId)
    .single();

  if (!dbUser) {
    const {  newUser } = await supabase
      .from('users')
      .insert({
        telegram_id: telegramId,
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        username: user.username || '',
      })
      .select()
      .single();
    dbUser = newUser;
  }

  // Проверить активную подписку
  const {  activeSub } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', dbUser.id)
    .eq('status', 'active')
    .gte('next_billing_date', new Date().toISOString().split('T')[0])
    .single();

  const hasActiveSubscription = !!activeSub;

  res.json({
    success: true,
    user: {
      id: dbUser.id,
      telegram_id: dbUser.telegram_id,
      first_name: dbUser.first_name,
    },
    has_subscription: hasActiveSubscription,
  });
});

// === 2. Создание платежа ===
app.post('/api/create-payment', async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  const paymentId = uuidv4();

  try {
    const response = await axios.post(
      'https://api.yookassa.ru/v3/payments',
      {
        amount: { value: '299.00', currency: 'RUB' },
        confirmation: {
          type: 'redirect',
          return_url: 'https://t.me/your_bot', // или URL Mini App
        },
        capture: true,
        description: 'Подписка на бронирование слотов — 299 ₽/мес',
        metadata: { user_id: userId, payment_id: paymentId },
        save_payment_method: true,
      },
      {
        auth: {
          username: YOOKASSA_SHOP_ID,
          password: YOOKASSA_SECRET_KEY,
        },
        headers: { 'Content-Type': 'application/json', 'Idempotence-Key': paymentId },
      }
    );

    const { confirmation_url } = response.data.confirmation;
    res.json({ confirmation_url });
  } catch (error) {
    console.error('YooKassa error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Payment creation failed' });
  }
});

// === 3. Webhook от ЮKassa ===
app.post('/api/webhook/yookassa', basicAuth, async (req, res) => {
  const event = req.body;
  if (event.event !== 'payment.succeeded') {
    return res.status(200).end(); // игнорируем другие события
  }

  const metadata = event.object.metadata || {};
  const userId = metadata.user_id;
  const paymentMethodId = event.object.payment_method?.id;

  if (!userId) {
    console.warn('Webhook: no user_id in metadata');
    return res.status(200).end();
  }

  // Обновляем payment_method_id у пользователя
  if (paymentMethodId) {
    await supabase
      .from('users')
      .update({ payment_method_id: paymentMethodId })
      .eq('id', userId);
  }

  // Создаём или обновляем подписку
  const nextBilling = new Date();
  nextBilling.setDate(nextBilling.getDate() + 30);
  const nextBillingDate = nextBilling.toISOString().split('T')[0]; // YYYY-MM-DD

  const {  existingSub } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  if (existingSub) {
    // Продлеваем существующую
    await supabase
      .from('subscriptions')
      .update({ next_billing_date: nextBillingDate })
      .eq('id', existingSub.id);
  } else {
    // Создаём новую
    await supabase
      .from('subscriptions')
      .insert({
        user_id: userId,
        status: 'active',
        next_billing_date: nextBillingDate,
      });
  }

  res.status(200).end();
});

// === 4. Отдача React-приложения ===
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});