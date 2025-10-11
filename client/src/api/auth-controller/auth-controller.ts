/**
 * Логин/регистрация пользователя одним запросом
 */

import { useQuery } from '@tanstack/react-query';
import { AuthResponse } from './types';
import { getInitData } from '../../../utils/get-init-data';

const useCreateOrLoginUser = () => {
  const initData = getInitData();
  const query = useQuery<AuthResponse>({
    queryKey: ['auth'],
    queryFn: async (): Promise<AuthResponse> => {
      if (!initData) {
        throw new Error('Пользователь запускает ВНЕ Telegram');
      }

      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(initData),
      });

      if (!res.ok) {
        throw new Error('Auth failed');
      }

      return res.json();
    },
    enabled: !!initData,
  });

  return query;
};

export const authController = {
  useCreateOrLoginUser,
};
