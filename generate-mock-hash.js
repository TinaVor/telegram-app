const { createHmac } = require('crypto');

// Данные из вашего mock
const mockData = 'user=%7B%22id%22%3A123456789%2C%22is_bot%22%3Afalse%2C%22first_name%22%3A%22Test%22%2C%22username%22%3A%22testuser%22%2C%22language_code%22%3A%22en%22%2C%22is_premium%22%3Atrue%7D&chat_instance=1234567890123456789&chat_type=private&auth_date=1732650000';

// Ваш тестовый токен
const BOT_TOKEN = 'test-token-1';

// Генерируем секретный ключ (так же как в auth.js)
const SECRET_KEY = createHmac('sha256', BOT_TOKEN)
  .update('WebAppData')
  .digest();

// Генерируем хэш
const hash = createHmac('sha256', SECRET_KEY)
  .update(mockData)
  .digest('hex');

console.log('Correct hash:', hash);
