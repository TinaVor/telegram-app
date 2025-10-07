import { useEffect, useState } from 'react';

function App() {
  const [userName, setUserName] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Проверяем, запущено ли приложение внутри Telegram
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      const webApp = window.Telegram.WebApp;

      // Говорим Telegram, что приложение готово
      webApp.ready();

      // Получаем данные пользователя
      const user = webApp.initDataUnsafe?.user;
      if (user?.first_name) {
        setUserName(user.first_name);
      } else {
        setError(true);
      }
    } else {
      // Не в Telegram — ошибка
      setError(true);
    }
  }, []);

  if (error) {
    return (
      <div style={{ padding: 20, textAlign: 'center' }}>
        <h2>❌ Ошибка</h2>
        <p>Запустите это приложение из Telegram!</p>
      </div>
    );
  }

  if (!userName) {
    return <div style={{ padding: 20, textAlign: 'center' }}>Загрузка...</div>;
  }

  return (
    <div style={{ padding: 20, textAlign: 'center' }}>
      <h2>Привет, {userName}!</h2>
      <p>Вы запустили Mini App в Telegram 🎉</p>
    </div>
  );
}

export default App;