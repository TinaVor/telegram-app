const jwt = require('jsonwebtoken');
const { supabase, db } = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';

const authenticateToken = async (req, res, next) => {
  // console.log('server auth middleware: incoming request headers:', req.headers);
  // console.log('server auth middleware: URL =', req.url);
  // console.log('server auth middleware: method =', req.method);

  const authHeader = req.headers['authorization'];
  // console.log('server auth middleware: auth header =', authHeader);
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  // console.log('server auth middleware: extracted token =', token);

  if (!token) {
    console.log('server auth middleware: no token for request to', req.url);
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    // console.log('server auth middleware: verifying JWT token');
    const decoded = jwt.verify(token, JWT_SECRET);
    // console.log('server auth middleware: decoded token =', decoded);
    // console.log('server auth middleware: NODE_ENV =', process.env.NODE_ENV);

    if (process.env.NODE_ENV === 'production') {
      if (!supabase) {
        return res.status(500).json({ message: 'Database not configured' });
      }

      const { data: user, error } = await supabase
        .from('users')
        .select('id, telegram_id, first_name, last_name, username')
        .eq('id', decoded.userId)
        .single();

      if (error || !user) {
        return res.status(401).json({ message: 'Invalid token' });
      }

      req.user = user;
      next();
    } else {
      // SQLite - используем Promise для корректного асинхронного поведения
      const checkUser = new Promise((resolve, reject) => {
        db.get(
          'SELECT id, telegram_id, first_name, last_name, username FROM users WHERE id = ?',
          [decoded.userId],
          (err, user) => {
            if (err) {
              reject(err);
            } else {
              resolve(user);
            }
          }
        );
      });

      try {
        const user = await checkUser;
        if (!user) {
          return res.status(401).json({ message: 'Invalid token' });
        }

        req.user = user;
        next();
      } catch (err) {
        console.error('Database error in authenticateToken:', err);
        return res.status(500).json({ message: 'Database error' });
      }
    }
  } catch (error) {
    return res.status(403).json({ message: 'Invalid token' });
  }
};

module.exports = {
  authenticateToken,
  JWT_SECRET,
};
