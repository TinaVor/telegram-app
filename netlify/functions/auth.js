// netlify/functions/auth.js
const { createHmac } = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SECRET_KEY = createHmac('sha256', 'WebAppData')
  .update(BOT_TOKEN)
  .digest();

function validate(initDataRaw) {
  const params = new URLSearchParams(initDataRaw);
  const hash = params.get('hash');
  if (!hash) return false;
  params.delete('hash');

  const checkString = Array.from(params.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  const calcHash = createHmac('sha256', SECRET_KEY)
    .update(checkString)
    .digest('hex');

  return hash === calcHash;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const { initData } = body;
  if (!initData || !validate(initData)) {
    return { statusCode: 401, body: 'Unauthorized' };
  }

  const user = JSON.parse(new URLSearchParams(initData).get('user'));
  const telegramId = String(user.id);

  // Пытаемся найти
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('telegram_id', telegramId)
    .single();

  if (existing) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'пользователь найден' }),
    };
  }

  // Создаём
  await supabase.from('users').insert({
    telegram_id: telegramId,
    first_name: user.first_name || '',
    last_name: user.last_name || '',
    username: user.username || '',
    created_at: new Date().toISOString(),
  });

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'пользователь создан' }),
  };
};