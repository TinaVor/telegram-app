import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createAuthenticatedFetch } from '../../components/auth-provider';
import { useAuth } from '../../components/auth-provider';

export type SubscriptionPlanType = 'basic' | 'premium';

export interface Subscription {
  id: string;
  user_id: number;
  status: string;
  expired_date: string;
  is_active?: boolean;
  days_remaining?: number;
  plan_type?: SubscriptionPlanType;
}

export interface SubscriptionStatus {
  has_subscription: boolean;
  is_active: boolean;
  expired_date?: string;
  days_remaining: number;
  message?: string;
}

export interface CreateSubscriptionRequest {
  plan_type: SubscriptionPlanType;
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

// Получить детали подписки
const getSubscription = async (getToken: () => string | null): Promise<{ subscription: Subscription | null; message?: string }> => {
  const authenticatedFetch = getAuthenticatedFetch(getToken);
  const res = await authenticatedFetch('/api/subscriptions');

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Failed to get subscription');
  }

  return res.json();
};

// Создать или обновить подписку
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

// React Query hooks
export const useGetSubscriptionStatus = () => {
  const getToken = useGetToken();

  return useQuery<SubscriptionStatus>({
    queryKey: ['subscription', 'status'],
    queryFn: () => getSubscriptionStatus(getToken),
    retry: 1,
  });
};

export const useGetSubscription = () => {
  const getToken = useGetToken();

  return useQuery<{ subscription: Subscription | null; message?: string }>({
    queryKey: ['subscription'],
    queryFn: () => getSubscription(getToken),
    retry: 1,
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

// Проверить, активна ли подписка
export const checkSubscriptionActive = (subscription: Subscription | null): boolean => {
  if (!subscription) return false;
  
  const now = new Date();
  const expiredDate = new Date(subscription.expired_date);
  return expiredDate > now;
};

// Получить оставшиеся дни подписки
export const getSubscriptionDaysRemaining = (subscription: Subscription | null): number => {
  if (!subscription) return 0;
  
  const now = new Date();
  const expiredDate = new Date(subscription.expired_date);
  const diffTime = expiredDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.max(0, diffDays);
};

export const subscriptionController = {
  useGetSubscriptionStatus,
  useGetSubscription,
  useCreateSubscription,
  checkSubscriptionActive,
  getSubscriptionDaysRemaining,
};
