import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createAuthenticatedFetch } from '../../components/auth-provider';
import { useAuth } from '../../components/auth-provider';

export interface Subscription {
  id: string;
  user_id: number;
  status: 'active' | 'inactive';
  remaining_slots: number;
  plan_type?: 'basic' | 'premium';
}

export interface SubscriptionStatus {
  has_subscription: boolean;
  is_active: boolean;
  remaining_slots: number;
  message?: string;
}

export interface CreateSubscriptionRequest {
  plan_type: 'basic' | 'premium';
}

// Получить токен из контекста
const useGetToken = () => {
  const { token } = useAuth();
  return () => token;
};

// Кастомный fetch с токеном
const getAuthenticatedFetch = (getToken: () => string | null) => createAuthenticatedFetch(getToken);

// Получить статус подписки
const getSubscriptionStatus = async (getToken: () => string | null): Promise<SubscriptionStatus> => {
  const authenticatedFetch = getAuthenticatedFetch(getToken);
  const res = await authenticatedFetch('/api/subscriptions/status');

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Failed to get subscription status');
  }

  return res.json();
};

// Создать подписку
const createSubscription = async (data: CreateSubscriptionRequest, getToken: () => string | null): Promise<{ message: string; subscription: Subscription }> => {
  const authenticatedFetch = getAuthenticatedFetch(getToken);
  const res = await authenticatedFetch('/api/subscriptions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Failed to create subscription');
  }

  return res.json();
};

// Использовать слот
const useSlot = async (getToken: () => string | null): Promise<{ message: string; remaining_slots: number }> => {
  const authenticatedFetch = getAuthenticatedFetch(getToken);
  const res = await authenticatedFetch('/api/subscriptions/use-slot', {
    method: 'POST',
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Failed to use slot');
  }

  return res.json();
};

// React Query hooks
export const useGetSubscriptionStatus = () => {
  const getToken = useGetToken();

  return useQuery<SubscriptionStatus>({
    queryKey: ['subscription', 'status'],
    queryFn: () => getSubscriptionStatus(getToken),
  });
};

export const useCreateSubscription = () => {
  const getToken = useGetToken();
  const queryClient = useQueryClient();

  return useMutation<
    { message: string; subscription: Subscription },
    Error,
    CreateSubscriptionRequest
  >({
    mutationFn: (data: CreateSubscriptionRequest) => createSubscription(data, getToken),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      queryClient.invalidateQueries({ queryKey: ['subscription', 'status'] });
    },
  });
};

export const useUseSlot = () => {
  const getToken = useGetToken();
  const queryClient = useQueryClient();

  return useMutation<
    { message: string; remaining_slots: number },
    Error
  >({
    mutationFn: () => useSlot(getToken),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      queryClient.invalidateQueries({ queryKey: ['subscription', 'status'] });
    },
  });
};

export const subscriptionController = {
  useGetSubscriptionStatus,
  useCreateSubscription,
  useUseSlot,
};
