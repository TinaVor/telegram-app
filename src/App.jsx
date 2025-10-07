import { useEffect, useState } from 'react';

function App() { const [userName, setUserName] = useState<string | null>(null); const [error, setError] = useState(false); const [loading, setLoading] = useState(true);

useEffect(() => { // Проверяем, запущено ли приложение внутри Telegram const win = typeof window !== 'undefined' ? (window as any) : null; const webApp = win?.Telegram?.WebApp;

 
if (webApp) {
  // Говорим Telegram, что приложение готово
  webApp.ready();

  // Получаем данные пользователя (объект может отсутствовать)
  const user = webApp.initDataUnsafe?.user;
  if (user?.first_name) {
    setUserName(user.first_name);
  } else {
    setError(true);
  }
  setLoading(false);
} else {
  // Не в Telegram — можно показать сообщение или мок
  // Здесь оставляем ошибку/помощь для локального запуска
  setError(true);
  setLoading(false);
}
}, []);

if (loading) { return <div style={{ padding: 20, textAlign: 'center' }}>Загрузка...</div>; }

if (error) { return ( <div style={{ padding: 20, textAlign: 'center' }}> <h2>❌ Ошибка</h2> <p>Запустите это приложение из Telegram или подключите тестовые данные.</p> </div> ); }

return ( <div style={{ padding: 20, textAlign: 'center' }}> <h2>Привет, {userName}!</h2> <p>Вы запустили Mini App в Telegram 🎉</p> </div> ); }

export default App;