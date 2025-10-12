const express = require('express');
const { supabase, db } = require('../../db');
const { authenticateToken } = require('../../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

router.post('/create', async (req, res) => {
  const { client_id, api_key } = req.body;
  const userId = req.user.id;

  if (!client_id || !api_key) {
    return res
      .status(400)
      .json({ message: 'client_id and api_key are required' });
  }

  try {
    if (process.env.NODE_ENV === 'production') {
      if (!supabase) {
        return res.status(500).json({ message: 'Database not configured' });
      }

      // Проверяем уникальность client_id + api_key
      const { data: existing } = await supabase
        .from('ozon_personal_accounts')
        .select('id')
        .eq('client_id', client_id)
        .eq('api_key', api_key)
        .single();

      if (existing) {
        return res.status(409).json({
          message: 'Account with this client_id and api_key already exists',
        });
      }

      const { data: newAccount, error } = await supabase
        .from('ozon_personal_accounts')
        .insert({
          user_id: userId,
          client_id,
          api_key,
        })
        .select('id, user_id, client_id, api_key')
        .single();

      if (error) throw error;

      res.status(201).json({
        message: 'Ozon personal account created successfully',
        account: newAccount,
      });
    } else {
      // SQLite
      const { randomUUID } = require('crypto');
      db.get(
        'SELECT id FROM ozon_personal_accounts WHERE client_id = ? AND api_key = ?',
        [client_id, api_key],
        (err, existing) => {
          if (err) {
            return res.status(500).json({ message: 'Database error' });
          }

          if (existing) {
            return res.status(409).json({
              message: 'Account with this client_id and api_key already exists',
            });
          }

          const newAccountId = randomUUID();
          db.run(
            'INSERT INTO ozon_personal_accounts (id, user_id, client_id, api_key) VALUES (?, ?, ?, ?)',
            [newAccountId, userId, client_id, api_key],
            function (err) {
              if (err) {
                return res.status(500).json({ message: 'Database error' });
              }

              const newAccount = {
                id: newAccountId,
                user_id: userId,
                client_id,
                api_key,
              };

              res.status(201).json({
                message: 'Ozon personal account created successfully',
                account: newAccount,
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

// GET /ozon-personal-account/list
router.get('/list', async (req, res) => {
  const userId = req.user.id;

  try {
    if (process.env.NODE_ENV === 'production') {
      if (!supabase) {
        return res.status(500).json({ message: 'Database not configured' });
      }

      const { data: accounts, error } = await supabase
        .from('ozon_personal_accounts')
        .select('id, user_id, client_id, api_key')
        .eq('user_id', userId);

      if (error) throw error;

      res.json(accounts || []);
    } else {
      // SQLite
      db.all(
        'SELECT id, user_id, client_id, api_key FROM ozon_personal_accounts WHERE user_id = ?',
        [userId],
        (err, accounts) => {
          if (err) {
            return res.status(500).json({ message: 'Database error' });
          }

          res.json(accounts || []);
        }
      );
    }
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE /ozon-personal-account/:id
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    if (process.env.NODE_ENV === 'production') {
      if (!supabase) {
        return res.status(500).json({ message: 'Database not configured' });
      }

      // Проверяем, что аккаунт принадлежит пользователю
      const { data: account } = await supabase
        .from('ozon_personal_accounts')
        .select('id')
        .eq('id', id)
        .eq('user_id', userId)
        .single();

      if (!account) {
        return res
          .status(404)
          .json({ message: 'Account not found or access denied' });
      }

      const { error } = await supabase
        .from('ozon_personal_accounts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      res.json({ message: 'Ozon personal account deleted successfully' });
    } else {
      // SQLite
      db.run(
        'DELETE FROM ozon_personal_accounts WHERE id = ? AND user_id = ?',
        [id, userId],
        function (err) {
          if (err) {
            return res.status(500).json({ message: 'Database error' });
          }

          if (this.changes === 0) {
            return res
              .status(404)
              .json({ message: 'Account not found or access denied' });
          }

          res.json({ message: 'Ozon personal account deleted successfully' });
        }
      );
    }
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
