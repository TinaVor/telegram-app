const fs = require('fs');
const path = require('path');

// Создаем директорию для логов если не существует
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Функция для форматирования времени
const formatDateTime = (date) => {
  const pad = (num) => String(num).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

// Функция для логирования в файл
const logToFile = (message, fileName = 'requests.log') => {
  const logPath = path.join(logsDir, fileName);
  const timestampedMessage = `[${formatDateTime(new Date())}] ${message}\n`;

  fs.appendFileSync(logPath, timestampedMessage, 'utf8');
};

// Middleware для логирования входящих запросов
const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  const timestamp = formatDateTime(new Date());

  // Логируем начало запроса

  // Логируем заголовки (включая авторизацию)
  const headers = { ...req.headers };

  // Логируем тело запроса (исключая слишком большие payloads)
  let bodyLog = '';
  if (req.body && Object.keys(req.body).length > 0) {
    const bodySize = JSON.stringify(req.body).length;
    if (bodySize < 10000) { // Ограничиваем размер тела для логирования
      bodyLog = JSON.stringify(req.body, null, 2);
    } else {
      bodyLog = `[Большой payload - размер: ${bodySize} символов]`;
    }
  }



  // Перехватываем окончание ответа для логирования
  const originalSend = res.send;
  let responseBody = '';

  res.send = function (data) {
    responseBody = data;
    return originalSend.call(this, data);
  };

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;
    const endTimestamp = formatDateTime(new Date());


    // Записываем в файл для анализа
    const logEntry = `${endTimestamp} | ${req.method} ${req.originalUrl} | ${statusCode} | ${duration}ms | IP: ${req.ip} | User-Agent: ${req.get('User-Agent') || 'Unknown'}`;
    logToFile(logEntry);

    // Подробное логирование для ошибок и необычных статусов
    if (statusCode >= 400 || duration > 10000) { // Дольше 10 секунд считаем подозрительным
      console.error(`[${endTimestamp}] ПОДРОБНЫЙ ЛОГ ЗАПРОСА:`);
      console.error(`Метод: ${req.method}`);
      console.error(`URL: ${req.originalUrl}`);
      console.error(`Статус: ${statusCode}`);
      console.error(`Длительность: ${duration}мс`);
      console.error(`IP: ${req.ip}`);
      console.error(`User-Agent: ${req.get('User-Agent')}`);

      if (req.headers.authorization) {
        const token = req.headers.authorization.split(' ')[1];
        console.error(`JWT token (первые 50 символов): ${token ? token.substring(0, 50) : 'Не найден'}`);
      }

      // Логируем возможные причины ошибок
      if (statusCode === 401) {
        console.error('Причина: Отсутствие или неверный токен авторизации');
      } else if (statusCode === 403) {
        console.error('Причина: Недостаточно прав или истекший токен');
      } else if (statusCode === 404) {
        console.error('Причина: Неверный endpoint или ресурс не найден');
      } else if (statusCode === 500) {
        console.error('Причина: Внутренняя ошибка сервера');
      }

      if (duration > 30000) { // Очень долго
        console.error('Причина: Возможный deadlock, долгое выполнение или проблема с сетью');
      }
    }
  });

  // Обработка ошибок
  res.on('error', (error) => {
    const errorTimestamp = formatDateTime(new Date());
    console.error(`[${errorTimestamp}] ОШИБКА ОТВЕТА на ${req.method} ${req.originalUrl}:`, error.message);
    logToFile(`ERROR: ${req.method} ${req.originalUrl} - ${error.message}`, 'errors.log');
  });

  // Обработка прерываний запроса
  req.on('aborted', () => {
    const abortTimestamp = formatDateTime(new Date());
    console.warn(`[${abortTimestamp}] ЗАПРОС ПРЕРВАН: ${req.method} ${req.originalUrl}`);
    logToFile(`ABORTED: ${req.method} ${req.originalUrl}`, 'aborted_requests.log');
  });

  next();
};

module.exports = {
  requestLogger,
  logToFile
};
