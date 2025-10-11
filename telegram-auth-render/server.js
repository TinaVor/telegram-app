// server.js
const express = require('express');
const cors = require('cors');
const { createHash } = require('crypto');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

const app = express();

// Разрешаем запросы из Telegram Mini App
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// === Конфигурация (берётся из переменных окружения) ===
const BOT_TOKEN = process.env.BOT_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const JWT_SECRET = process.env.JWT_SECRET;

if (!BOT_TOKEN || !SUPABASE_URL || !SUPABASE_ANON_KEY || !JWT_SECRET) {
  console.warn('⚠️ Внимание: не все переменные окружения заданы!');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 🔐 Проверка подписи initData от Telegram
function validateInitData(initData, botToken) {
  const searchParams = new URLSearchParams(initData);
  const hash = searchParams.get('hash');
  if (!hash) return false;

  searchParams.delete('hash');

  const sortedParams = Array.from(searchParams.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const secretKey = createHash('sha256').update(botToken, 'utf8').digest();
  const computedHash = createHash('sha256')
    .update(sortedParams, 'utf8')
    .digest('hex');

  return computedHash === hash;
}

// 🧠 Эндпоинт /api/auth
app.post('/api/auth', async (req, res) => {
  try {
    const { initData } = req.body;

    if (!initData) {
      return res.status(400).json({ error: 'initData is required' });
    }

    if (!validateInitData(initData, BOT_TOKEN)) {
      return res.status(403).json({ error: 'Invalid signature' });
    }

    // Извлекаем данные пользователя
    const params = new URLSearchParams(initData);
    const userStr = params.get('user');
    if (!userStr) {
      return res.status(400).json({ error: 'User data missing' });
    }

    let telegramUser;
    try {
      telegramUser = JSON.parse(decodeURIComponent(userStr));
    } catch (e) {
      return res.status(400).json({ error: 'Invalid user data format' });
    }

    const { id: telegramId, username, first_name, last_name } = telegramUser;

    // Поиск или создание пользователя в Supabase
    let {  user, error } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', telegramId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!user) {
      const {  newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          telegram_id: telegramId,
          username: username || null,
          first_name: first_name || null,
          last_name: last_name || null,
        })
        .select()
        .single();

      if (insertError) {
        console.error('Insert error:', insertError);
        return res.status(500).json({ error: 'Failed to create user' });
      }
      user = newUser;
    }

    // Генерация JWT
    const token = jwt.sign(
      { userId: user.id, telegramId: user.telegram_id },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        telegram_id: user.telegram_id,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
      },
      token,
    });
  } catch (err) {
    console.error('Unexpected error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Проверочный эндпоинт (опционально)
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Сервер запущен на порту ${PORT}`);
});