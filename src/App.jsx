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

      // Имитация загрузки (как у тебя)
      setTimeout(() => {
        const hasSubscription = false; // ← поменяй на true для теста "поставок"
        if (hasSubscription) {
          setStatus('subscribed');
        } else {
          setStatus('not-subscribed');
        }
      }, 1000);
    } else {
      // Не в Telegram — показываем ошибку
      setStatus('auth-error');
    }
  }, []);

  if (status === 'loading') {
    return (
      <div style={styles.center}>
        <h2>Загрузка...</h2>
      </div>
    );
  }

  if (status === 'auth-error') {
    return (
      <div style={styles.center}>
        <h2>Ошибка {{initData}} </h2>
        <p>Откройте это приложение из Telegram!!!!</p>
        <p style={{ fontSize: '12px', color: '#888', marginTop: '20px' }}>
          (Это не работает в обычном браузере)
        </p>
      </div>
    );
  }

  if (status === 'not-subscribed') {
    return (
      <div style={styles.center}>
        <h2>Оплатите подписку</h2>
        <button style={styles.button}>Оплатить</button>
      </div>
    );
  }

  // Статус: subscribed
  return (
    <div style={styles.center}>
      <h2>Ваши поставки</h2>
      <p>Привет, {user?.first_name || 'друг'}!</p>
      <p>Завтра приедет поставка №123.</p>
    </div>
  );
}

const styles = {
  center: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    padding: '20px',
    textAlign: 'center',
    backgroundColor: '#f9f9f9',
    fontFamily: 'Arial, sans-serif',
  },
  button: {
    marginTop: '20px',
    padding: '12px 24px',
    fontSize: '16px',
    backgroundColor: '#3390ec',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
};

export default App;