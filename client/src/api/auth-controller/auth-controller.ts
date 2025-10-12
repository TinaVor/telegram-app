/**
 * Логин/регистрация пользователя одним запросом
 */

import { useQuery } from '@tanstack/react-query';
import { AuthResponse } from './types';
import { getInitData } from '../../../utils/get-init-data';

const useCreateOrLoginUser = () => {
  const initData = getInitData();
  // console.log('authController: useCreateOrLoginUser hook called, initData =', !!initData);
  // console.log('authController: enabled =', !!initData);

  const query = useQuery<AuthResponse>({
    queryKey: ['auth', JSON.stringify(initData)], // Делаем queryKey уникальным для каждого initData
    queryFn: async (): Promise<AuthResponse> => {
      // console.log('🟡 authController: queryFn called - EXECUTING request!');

      if (!initData) {
        throw new Error('Пользователь запускает ВНЕ Telegram');
      }

      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(initData),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.log('authController: auth failed with status', res.status, '- error:', errorText);
        throw new Error('Auth failed');
      }

      const data = await res.json();
      // console.log('authController: auth success - user authenticated');
      return data;
    },
    enabled: !!initData,
  });

  return query;
};

export const authController = {
  useCreateOrLoginUser,
};
