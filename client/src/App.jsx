import { useEffect, useState } from 'react';
import WebApp from '@twa-dev/sdk';
import { css } from '@emotion/react';

export const App = () => {
  const [status, setStatus] = useState('loading');
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const init = async () => {
      const { initData } = WebApp;
      if (!initData) return setStatus('error');

      try {
        const res = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData }),
        });
        const data = await res.json();

        if (!data.success) return setStatus('auth-error');

        setUserName(data.user.first_name);

        if (data.has_subscription) {
          setStatus('subscribed');
        } else {
          setStatus('not-subscribed');
        }
      } catch (err) {
        setStatus('auth-error');
      }
    };

    init();
  }, []);

  const handlePay = async () => {
    const { initDataUnsafe } = WebApp;
    const telegramId = String(initDataUnsafe?.user?.id);

    // Получаем userId через временный запрос (в реальности лучше кэшировать)
    const authRes = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData: WebApp.initData }),
    });
    const authData = await authRes.json();

    const payRes = await fetch('/api/create-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: authData.user.id }),
    });
    const payData = await payRes.json();

    if (payData.confirmation_url) {
      WebApp.openLink(payData.confirmation_url); // откроет ЮKassa в браузере
    }
  };

  if (status === 'loading') return <div css={containerStyle}><h2>Загрузка...</h2></div>;
  if (status === 'error') return <div css={containerStyle}><h2>Ошибка</h2><p>Запускайте из Telegram!</p></div>;
  if (status === 'auth-error') return <div css={containerStyle}><h2>Ошибка авторизации</h2></div>;

  if (status === 'not-subscribed') {
    return (
      <div css={containerStyle}>
        <h2>Оплатите подписку</h2>
        <p>299 ₽ / месяц</p>
        <button css={buttonStyle} onClick={handlePay}>Оплатить</button>
      </div>
    );
  }

  return (
    <div css={containerStyle}>
      <h2>Ваши поставки</h2>
      <p>Привет, {userName}!</p>
      <p>Завтра приедет поставка №123.</p>
    </div>
  );
};

const containerStyle = css`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  padding: 20px;
  text-align: center;
`;

const buttonStyle = css`
  margin-top: 20px;
  padding: 12px 24px;
  font-size: 16px;
  background-color: #0088cc;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
`;