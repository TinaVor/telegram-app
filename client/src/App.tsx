import WebApp from '@twa-dev/sdk';
import styled from '@emotion/styled';
import { authController } from './api';
import { getInitData } from '../utils/get-init-data';

export const App = () => {
  const initData = getInitData();

  const { data, isLoading, error } = authController.useCreateOrLoginUser();

  const getMessage = () => {
    if (!initData) return 'Запускайте из Telegram!';
    if (isLoading) return 'Загрузка...';
    if (error) return 'Ошибка авторизации';
    return data?.message || 'Готово';
  };

  return (
    <Container>
      <h2>{getMessage()}</h2>
    </Container>
  );
};

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  padding: 20px;
  text-align: center;
`;
