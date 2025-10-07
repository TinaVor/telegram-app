import { useEffect, useState } from 'react';
import { retrieveLaunchParams } from '@twa-dev/sdk';

function App() {
  const [status, setStatus] = useState('loading');
  const [userName, setUserName] = useState(''); // ← новое состояние для имени

  useEffect(() => {
    const init = async () => {
      try {
        const { initData, initDataUnsafe } = retrieveLaunchParams();

        if (!initData) {
          setStatus('error');
          return;
        }

        // Получаем имя пользователя из initDataUnsafe
        const firstName = initDataUnsafe?.user?.first_name || 'Друг';
        setUserName(firstName);

        // Имитируем ответ от сервера
        setTimeout(() => {
          const hasSubscription = false; // поменяй на true, чтобы увидеть "поставки"

          if (hasSubscription) {
            setStatus('subscribed');
          } else {
            setStatus('not-subscribed');
          }
        }, 1500);
      } catch (err) {
        setStatus('auth-error');
      }
    };

    init();
  }, []);

  if (status === 'loading') {
    return <div style={styles.center}><h2>Загрузка...</h2></div>;
  }

  if (status === 'error') {
    return (
      <div style={styles.center}>
        <h2>Ошибкииииииии</h2>
        <p>Запускайте из Telegram!</p>
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

  return (
    <div style={styles.center}>
      <h2>Ваши поставки</h2>
      <p>Привет, {firstName}!</p> {/* ← теперь реальное имя */}
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
  },
  button: {
    marginTop: '20px',
    padding: '12px 24px',
    fontSize: '16px',
    backgroundColor: '#0088cc',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
};

export default App;