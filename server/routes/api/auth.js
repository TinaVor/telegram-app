const express = require('express');
const { createHmac } = require('crypto');
const jwt = require('jsonwebtoken');
const { supabase, db } = require('../../db');
const { JWT_SECRET } = require('../../middleware/auth');

const router = express.Router();

router.post('/', async (req, res) => {
  console.log('server auth route: incoming request body:', req.body);
  console.log('server auth route: headers:', req.headers);

  const initData = req.body;

  if (!initData) {
    console.log('server auth route: no initData');
    return res.status(400).json({ message: 'initData required' });
  }

  console.log('server auth route: initData received:', initData);
  // Проверка подписи

  const BOT_TOKEN =
    process.env.NODE_ENV === 'production'
      ? process.env.TELEGRAM_BOT_TOKEN
      : 'test-token-1';

  console.log('server auth route: NODE_ENV =', process.env.NODE_ENV);
  console.log('server auth route: BOT_TOKEN =', BOT_TOKEN);

  const SECRET_KEY = createHmac('sha256', BOT_TOKEN)
    .update('WebAppData')
    .digest();

  console.log('server auth route: calculated SECRET_KEY');

  const hash = initData.hash;

  if (!hash) {
    console.log('server auth route: no hash in initData');
    return res.status(401).json({ message: 'Invalid' });
  }

  console.log('server auth route: hash =', hash);

  const params = { ...initData };

  delete params.hash;

  const dataCheckString = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('\n');

  const calcHash =
    process.env.NODE_ENV === 'production'
      ? createHmac('sha256', SECRET_KEY).update(dataCheckString).digest('hex')
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
        const token = jwt.sign({ userId: existing.id }, JWT_SECRET, {
          expiresIn: '24h',
        });
        return res.json({
          message: 'пользователь найден',
          token,
          user: existing,
        });
      }

      const { data: newUser } = await supabase
        .from('users')
        .insert({
          telegram_id: telegramId,
          first_name: user.first_name || '',
          last_name: user.last_name || '',
          username: user.username || '',
        })
        .select('id, telegram_id, first_name, last_name, username')
        .single();

      const token = jwt.sign({ userId: newUser.id }, JWT_SECRET, {
        expiresIn: '24h',
      });

      res.json({
        message: 'пользователь создан',
        token,
        user: newUser,
      });
    } else {
      // Local development with SQLite
      db.get(
        'SELECT id, telegram_id, first_name, last_name, username FROM users WHERE telegram_id = ?',
        [telegramId],
        (err, existingUser) => {
          if (err) {
            return res.status(500).json({ message: 'Database error' });
          }

          if (existingUser) {
            const token = jwt.sign({ userId: existingUser.id }, JWT_SECRET, {
              expiresIn: '24h',
            });
            return res.json({
              message: 'пользователь найден',
              token,
              user: existingUser,
            });
          }

          db.run(
            'INSERT INTO users (telegram_id, first_name, last_name, username) VALUES (?, ?, ?, ?)',
            [
              telegramId,
              user.first_name || '',
              user.last_name || '',
              user.username || '',
            ],
            function (err) {
              if (err) {
                return res.status(500).json({ message: 'Database error' });
              }

              const newUserId = this.lastID;
              const newUser = {
                id: newUserId,
                telegram_id: telegramId,
                first_name: user.first_name || '',
                last_name: user.last_name || '',
                username: user.username || '',
              };

              const token = jwt.sign({ userId: newUserId }, JWT_SECRET, {
                expiresIn: '24h',
              });

              res.json({
                message: 'пользователь создан',
                token,
                user: newUser,
              });
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
