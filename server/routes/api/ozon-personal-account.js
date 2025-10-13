const express = require('express');
const { supabase, db } = require('../../db');
const { authenticateToken } = require('../../middleware/auth');
const { makeOzonRequestForAccount } = require('../../ozon-api');

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
    let newAccount = null;

    if (process.env.NODE_ENV === 'production') {
      if (!supabase) {
        return res.status(500).json({ message: 'Database not configured' });
      }

      // Проверяем, что client_id не используется другим пользователем
      const { data: existingByClientId } = await supabase
        .from('ozon_personal_accounts')
        .select('id, user_id')
        .eq('client_id', client_id)
        .single();

      if (existingByClientId) {
        if (existingByClientId.user_id !== userId) {
          return res.status(409).json({
            message: 'This client_id is already used by another user',
          });
        } else {
          return res.status(409).json({
            message: 'This client_id is already linked to your account',
          });
        }
      }

      // Проверяем уникальность api_key (уже существующей комбинации client_id + api_key)
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

      const { data: accountData, error } = await supabase
        .from('ozon_personal_accounts')
        .insert({
          user_id: userId,
          client_id,
          api_key,
        })
        .select('id, user_id, client_id, api_key')
        .single();

      if (error) throw error;
      newAccount = accountData;

      // Вызываем проверку обновлений для нового аккаунта
      console.log(`Запуск проверки обновлений для нового аккаунта ${newAccount.id}`);
      await makeOzonRequestForAccount(newAccount.id, client_id, api_key, userId);
    } else {
      // SQLite
      const { randomUUID } = require('crypto');
      // Сначала проверяем, что client_id не используется другим пользователем
      db.get(
        'SELECT id, user_id FROM ozon_personal_accounts WHERE client_id = ?',
        [client_id],
        (err, existingByClientId) => {
          if (err) {
            return res.status(500).json({ message: 'Database error' });
          }

          if (existingByClientId) {
            if (existingByClientId.user_id !== userId) {
              return res.status(409).json({
                message: 'This client_id is already used by another user',
              });
            } else {
              return res.status(409).json({
                message: 'This client_id is already linked to your account',
              });
            }
          }

          // Проверяем уникальность комбинации client_id + api_key
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
                async function (err) {
                  if (err) {
                    return res.status(500).json({ message: 'Database error' });
                  }

                  newAccount = {
                    id: newAccountId,
                    user_id: userId,
                    client_id,
                    api_key,
                  };

                  // Вызываем проверку обновлений для нового аккаунта
                  console.log(`Запуск проверки обновлений для нового аккаунта ${newAccountId}`);
                  try {
                    await makeOzonRequestForAccount(newAccountId, client_id, api_key, userId);
                  } catch (apiError) {
                    console.error('Ошибка при проверке обновлений нового аккаунта:', apiError);
                    // Не возвращаем ошибку, так как аккаунт уже создан
                  }

                  res.status(201).json({
                    message: 'Ozon personal account created successfully',
                    account: newAccount,
                  });
                }
              );
            }
          );
        }
      );
    }

    // Для Supabase отправляем ответ после вызова проверки
    if (process.env.NODE_ENV === 'production' && newAccount) {
      res.status(201).json({
        message: 'Ozon personal account created successfully',
        account: newAccount,
      });
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

      // Удаляем все заказы, связанные с этим аккаунтом
      const { error: ordersError } = await supabase
        .from('ozon_orders')
        .delete()
        .eq('ozon_personal_account_id', id);

      if (ordersError) {
        console.error('Error deleting orders:', ordersError);
        // Продолжаем удаление аккаунта даже если не удалось удалить заказы
      }

      const { error } = await supabase
        .from('ozon_personal_accounts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      res.json({ message: 'Ozon personal account deleted successfully' });
    } else {
      // SQLite
      // Используем транзакцию для удаления аккаунта и связанных заказов
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        // Удаляем все заказы, связанные с этим аккаунтом
        db.run(
          'DELETE FROM ozon_orders WHERE ozon_personal_account_id = ?',
          [id],
          function (err) {
            if (err) {
              console.error('Error deleting orders:', err);
              db.run('ROLLBACK');
              return res.status(500).json({ message: 'Database error deleting orders' });
            }

            // Теперь удаляем сам аккаунт
            db.run(
              'DELETE FROM ozon_personal_accounts WHERE id = ? AND user_id = ?',
              [id, userId],
              function (err) {
                if (err) {
                  db.run('ROLLBACK');
                  return res.status(500).json({ message: 'Database error' });
                }

                if (this.changes === 0) {
                  db.run('ROLLBACK');
                  return res
                    .status(404)
                    .json({ message: 'Account not found or access denied' });
                }

                db.run('COMMIT');
                res.json({ message: 'Ozon personal account deleted successfully' });
              }
            );
          }
        );
      });
    }
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
