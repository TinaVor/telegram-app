const jwt = require('jsonwebtoken');

// Контейнеры из логов
const JWT_SECRET = 'your-secret-key-here';
const tokenPrefix = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiO';

try {
  // Декодируем заголовок, чтобы понять структуру
  const decodedHeader = jwt.decode(tokenPrefix, { complete: true });
  console.log('Header:', decodedHeader);

  // Попробуем верифицировать с различными длинами токена
  for (let suffix = 0; suffix < 1000; suffix++) {
    try {
      const fullToken = tokenPrefix + suffix;
      const decoded = jwt.verify(fullToken, JWT_SECRET);
      console.log('Decoded token:', decoded);
      console.log('Full token worked with suffix:', suffix);
      break;
    } catch (error) {
      // Игнорируем ошибки верификации для этого суффикса
    }
  }
} catch (error) {
  console.error('Error decoding JWT:', error);
}
