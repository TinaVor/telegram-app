import { useEffect, useState } from 'react';
import WebApp from '@twa-dev/sdk';
import { css } from '@emotion/react';

export const App = () => {
  const [message, setMessage] = useState('Загрузка...');

  useEffect(() => {
    const init = async () => {
      const { initData } = WebApp;

      if (!initData) {
        setMessage('Запускайте из Telegram!');
        return;
      }

      try {
        const res = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData }),
        });

        const data = await res.json();
        setMessage(data.message || 'Готово');
      } catch (err) {
        setMessage('Ошибка авторизации');
      }
    };

    init();
  }, []);

  return (
    <div css={containerStyle}>
      <h2>{message}</h2>
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