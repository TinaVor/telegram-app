import { useEffect, useState } from 'react';

function App() {
  const [status, setStatus] = useState('loading');
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Проверяем, запущено ли приложение внутри Telegram
    if (typeof window.Telegram !== 'undefined' && window.Telegram.WebApp) {
      const webApp = window.Telegram.WebApp;

      // Включаем "назад" и прочие фичи (опционально)
      webApp.ready();
      webApp.expand(); // раскрываем на весь экран

      // Получаем initData — это строка вида "query_id=...&user=...&auth_date=...&hash=..."
      const initData = webApp.initData;

      if (!initData) {
        setStatus('auth-error');
        return;
      }

      // Парсим данные пользователя (опционально)
      try {
        // user — это JSON-строка внутри initData
        const userMatch = initData.match(/user=([^&]*)/);
        if (userMatch) {
          const userStr = decodeURIComponent(userMatch[1]);
          const userData = JSON.parse(userStr);
          setUser(userData);
        }
      } catch (e) {
        console.warn('Не удалось распарсить пользователя');
      }

      // Имитация