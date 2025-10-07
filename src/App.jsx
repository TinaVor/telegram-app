import { useEffect, useState } from 'react';
import WebApp from '@twa-dev/sdk';
import { css } from '@emotion/react';

export const App = () => {
  const [status, setStatus] = useState('loading');
  const [userName, setUserName] = useState(''); // ← новое состояние для имени

  useEffect(() => {
    const init = async () => {
      try {
        const { initData, initDataUnsafe } = WebApp;

        console.log('initData', initData)

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
    return <div css={containerStyle}><h2>Загрузка...</h2></div>;
  }

  if (status === 'error') {
    return (
      <div css={containerStyle}>
        <h2>Ошибкииииииииии</h2>
        <p>Запускайте из Telegram!</p>
      </div>
    );
  }

  if (status === 'not-subscribed') {
    return (
      <div css={containerStyle}>
        <h2>Оплатите подписку</h2>
        <button css={buttonStyle}>Оплатить</button>
      </div>
    );
  }

  return (
    <div css={containerStyle}>
      <h2>Ваши поставки</h2>
      <p>Привет, {userName}!</p> {/* ← теперь реальное имя */}
      <p>Завтра приедет поставка №123.</p>
    </div>
  );
}

const containerStyle = css`
    display: flex;
    flexDirection: column;
    alignItems: center;
    justifyContent: center;
    height: 100vh;
    padding: 20px;
    textAlign: center;
`

const buttonStyle = css`
    marginTop: 20px;
    padding: 12px 24px;
    fontSize: 16px;
    backgroundColor:'#0088cc;
    color: white;
    border: none;
    borderRadius: 8px;
    cursor: pointer;
`;
