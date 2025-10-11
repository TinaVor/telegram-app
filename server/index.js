// server/index.js
const express = require('express');
const path = require('path');
const { createHmac } = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client/dist')));

// Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Telegram auth
app.post('/api/auth', async (req, res) => {
  const { initData } = req.body;
  if (!initData) return res.status(400).json({ message: 'initData required' });

  // Проверка подписи
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const SECRET_KEY = createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
  
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return res.status(401).json({ message: 'Invalid' });

  params.delete('hash');
  const checkString = Array.from(params.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  const calcHash = createHmac('sha256', SECRET_KEY).update(checkString).digest('hex');
  if (hash !== calcHash) return res.status(401).json({ message: 'Invalid signature' });

  // Работа с пользователем
  const user = JSON.parse(params.get('user'));
  const telegramId = String(user.id);

  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('telegram_id', telegramId)
    .single();

  if (existing) {
    return res.json({ message: 'пользователь найден' });
  }

  await supabase.from('users').insert({
    telegram_id: telegramId,
    first_name: user.first_name || '',
    last_name: user.last_name || '',
    username: user.username || '',
  });

  res.json({ message: 'пользователь создан' });
});

// Обслуживание React-аппа
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});