import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createAuthenticatedFetch } from '../../components/auth-provider';
import { useAuth } from '../../components/auth-provider';

export interface Payment {
  id: string;
  user_id: number;
  amount: number;
  plan_type: 'basic' | 'premium';
  status: 'pending' | 'succeeded' | 'canceled' | 'failed';
  created_at?: string;
}

export interface CreatePaymentRequest {
  plan_type: 'basic' | 'premium';
  amount?: number;
}

export interface PaymentResponse {
  message: string;
  payment: {
    id: string;
    status: string;
    confirmation: {
      type: string;
      confirmation_url: string;
    };
    amount: {
      value: string;
      currency: string;
    };
    description: string;
  };
}

// Получить токен из контекста
const useGetToken = () => {
  const { token } = useAuth();
  return () => token;
};

// Кастомный fetch с токеном
const getAuthenticatedFetch = (getToken: () => string | null) => createAuthenticatedFetch(getToken);

// Создать платеж
const createPayment = async (data: CreatePaymentRequest, getToken: () => string | null): Promise<PaymentResponse> => {
  const authenticatedFetch = getAuthenticatedFetch(getToken);
  const res = await authenticatedFetch('/api/payments/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Failed to create payment');
  }

  return res.json();
};

// Получить статус платежа
const getPaymentStatus = async (paymentId: string, getToken: () => string | null): Promise<{ payment: Payment }> => {
  const authenticatedFetch = getAuthenticatedFetch(getToken);
  const res = await authenticatedFetch(`/api/payments/${paymentId}/status`);

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Failed to get payment status');
  }

  return res.json();
};

// Подтвердить платеж
const confirmPayment = async (paymentId: string, getToken: () => string | null): Promise<{ message: string; payment: Payment }> => {
  const authenticatedFetch = getAuthenticatedFetch(getToken);
  const res = await authenticatedFetch(`/api/payments/${paymentId}/confirm`, {
    method: 'POST',
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Failed to confirm payment');
  }

  return res.json();
};

// React Query hooks
export const useCreatePayment = () => {
  const getToken = useGetToken();
  const queryClient = useQueryClient();

  return useMutation<
    PaymentResponse,
    Error,
    CreatePaymentRequest
  >({
    mutationFn: (data: CreatePaymentRequest) => createPayment(data, getToken),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      queryClient.invalidateQueries({ queryKey: ['subscription', 'status'] });
    },
  });
};

export const useGetPaymentStatus = (paymentId: string) => {
  const getToken = useGetToken();

  return useQuery<{ payment: Payment }>({
    queryKey: ['payment', paymentId],
    queryFn: () => getPaymentStatus(paymentId, getToken),
    enabled: !!paymentId,
    retry: 3,
    retryDelay: 1000,
  });
};

export const useConfirmPayment = () => {
  const getToken = useGetToken();
  const queryClient = useQueryClient();

  return useMutation<
    { message: string; payment: Payment },
    Error,
    string
  >({
    mutationFn: (paymentId: string) => confirmPayment(paymentId, getToken),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      queryClient.invalidateQueries({ queryKey: ['subscription', 'status'] });
      queryClient.invalidateQueries({ queryKey: ['payment'] });
    },
  });
};

export const paymentController = {
  useCreatePayment,
  useGetPaymentStatus,
  useConfirmPayment,
};
