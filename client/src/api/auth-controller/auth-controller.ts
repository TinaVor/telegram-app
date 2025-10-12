/**
 * Логин/регистрация пользователя одним запросом
 */

import { useQuery } from '@tanstack/react-query';
import { AuthResponse } from './types';
import { getInitData } from '../../../utils/get-init-data';

const useCreateOrLoginUser = () => {
  const initData = getInitData();
  console.log('authController: useCreateOrLoginUser hook called, initData =', !!initData);
  console.log('authController: enabled =', !!initData);

  const query = useQuery<AuthResponse>({
    queryKey: ['auth', JSON.stringify(initData)], // Делаем queryKey уникальным для каждого initData
    queryFn: async (): Promise<AuthResponse> => {
      console.log('🟡 authController: queryFn called - EXECUTING request!');
      console.log('authController: useCreateOrLoginUser - preparing auth request');
      console.log('authController: initData present =', !!initData);
      console.log('authController: initData details =', initData);

      if (!initData) {
        throw new Error('Пользователь запускает ВНЕ Telegram');
      }

      console.log('authController: making POST /api/auth request');
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(initData),
      });

      console.log('authController: auth response status =', res.status);
      console.log('authController: auth response headers =', Object.fromEntries(res.headers.entries()));

      if (!res.ok) {
        const errorText = await res.text();
        console.log('authController: auth response error text =', errorText);
        throw new Error('Auth failed');
      }

      const data = await res.json();
      console.log('authController: auth response data =', data);
      return data;
    },
    enabled: !!initData,
  });

  return query;
};

export const authController = {
  useCreateOrLoginUser,
};
