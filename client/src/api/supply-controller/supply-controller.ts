/**
 * Логин/регистрация пользователя одним запросом
 */

import { useQuery } from '@tanstack/react-query';
import { getInitData } from '../../../utils/get-init-data';
import { GetSuppliesResponse } from './types';

const useGetUserSupplies = () => {
  const initData = getInitData();
  const query = useQuery<GetSuppliesResponse>({
    queryKey: ['all-supplies'],
    queryFn: async (): Promise<GetSuppliesResponse> => {
      if (!initData) {
        throw new Error('Пользователь запускает ВНЕ Telegram');
      }

      const res = await fetch('/api/supplies');

      console.log(res);

      if (!res.ok) {
        throw new Error('Auth failed');
      }

      return res.json();
    },
    enabled: !!initData,
  });

  return query;
};

export const supplyController = {
  useGetUserSupplies,
};
