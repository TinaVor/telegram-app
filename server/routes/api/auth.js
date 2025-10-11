const express = require('express');
const { createHmac } = require('crypto');
const { supabase, db } = require('../../db');

const router = express.Router();

router.post('/', async (req, res) => {
  const initData = req.body;

  if (!initData) return res.status(400).json({ message: 'initData required' });

  // Проверка подписи

  const BOT_TOKEN =
    process.env.NODE_ENV === 'production'
      ? process.env.TELEGRAM_BOT_TOKEN
      : 'test-token-1';

  const SECRET_KEY = createHmac('sha256', 'WebAppData')
    .update(BOT_TOKEN)
    .digest();

  const hash = initData.hash;

  if (!hash) return res.status(401).json({ message: 'Invalid' });

  const params = { ...initData };

  delete params.hash;

  const calcHash =
    process.env.NODE_ENV === 'production'
      ? createHmac('sha256', SECRET_KEY).digest('hex')
      : 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

  if (hash !== calcHash)
    return res.status(401).json({ message: 'Invalid signature' });

  // Работа с пользователем
  const user = initData.user;
  const telegramId = String(user.id);

  try {
    if (process.env.NODE_ENV === 'production') {
      if (!supabase) {
        return res.status(500).json({ message: 'Database not configured' });
      }

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
    } else {
      // Local development with SQLite
      db.get(
        'SELECT COUNT(*) AS count FROM users WHERE telegram_id = ?',
        [telegramId],
        (err, row) => {
          if (err) {
            return res.status(500).json({ message: 'Database error' });
          }

          if (row.count > 0) {
            return res.json({ message: 'пользователь найден' });
          }

          db.run(
            'INSERT INTO users (telegram_id, first_name, last_name, username) VALUES (?, ?, ?, ?)',
            [
              telegramId,
              user.first_name || '',
              user.last_name || '',
              user.username || '',
            ],
            (err) => {
              if (err) {
                return res.status(500).json({ message: 'Database error' });
              }
              res.json({ message: 'пользователь создан' });
            }
          );
        }
      );
    }
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
