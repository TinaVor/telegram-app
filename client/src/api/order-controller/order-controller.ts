import { useQuery } from '@tanstack/react-query';
import {
  createAuthenticatedFetch,
  useAuth,
} from '../../components/auth-provider';
import { GetSuppliesResponse } from './types';

const useGetUserOrders = () => {
  const { isAuthenticated } = useAuth();

  const query = useQuery<GetSuppliesResponse>({
    queryKey: ['all-order'],
    queryFn: async (): Promise<GetSuppliesResponse> => {
      if (!isAuthenticated) {
        throw new Error('Пользователь не авторизован');
      }

      const authenticatedFetch = createAuthenticatedFetch(
        () => localStorage.getItem('auth_token') || ''
      );
      const res = await authenticatedFetch('/api/supplies');

      if (!res.ok) {
        throw new Error('Ошибка запроса');
      }

      return res.json();
    },
    enabled: isAuthenticated,
  });

  return query;
};

export const orderController = {
  useGetUserOrders,
};
