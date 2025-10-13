import { useQuery, useMutation } from '@tanstack/react-query';
import {
  createAuthenticatedFetch,
  useAuth,
} from '../../components/auth-provider';
import { GetSuppliesResponse, BookSlotRequest, BookSlotResponse } from './types';

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

const useBookSlot = () => {
  const { isAuthenticated } = useAuth();

  const mutation = useMutation({
    mutationFn: async (data: BookSlotRequest): Promise<BookSlotResponse> => {
      if (!isAuthenticated) {
        throw new Error('Пользователь не авторизован');
      }

      const authenticatedFetch = createAuthenticatedFetch(
        () => localStorage.getItem('auth_token') || ''
      );
      const res = await authenticatedFetch('/api/ozon-order/book-slot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        throw new Error('Ошибка бронирования слота');
      }

      return res.json();
    },
  });

  return mutation;
};

export const orderController = {
  useGetUserOrders,
  useBookSlot,
};
