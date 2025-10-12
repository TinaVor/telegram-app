import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createAuthenticatedFetch } from '../../components/auth-provider';
import { useAuth } from '../../components/auth-provider';

type OzonPersonalAccount = {
  id: number;
  user_id: number;
  client_id: string;
  api_key: string;
};

type CreateAccountRequest = {
  client_id: string;
  api_key: string;
};

type CreateAccountResponse = {
  message: string;
  account: OzonPersonalAccount;
};

type ListAccountsResponse = OzonPersonalAccount[];

type DeleteAccountResponse = {
  message: string;
};

// Получаем токен из контекста
const useGetToken = () => {
  const { token } = useAuth();
  return () => token;
};

// Кастомный fetch с токеном
const getAuthenticatedFetch = (getToken: () => string | null) =>
  createAuthenticatedFetch(getToken);

// Создание аккаунта
const createAccount = async (
  data: CreateAccountRequest,
  getToken: () => string | null
): Promise<CreateAccountResponse> => {
  const authenticatedFetch = getAuthenticatedFetch(getToken);
  const res = await authenticatedFetch('/api/ozon-personal-account/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Failed to create account');
  }

  return res.json();
};

// Получение списка аккаунтов
const getAccounts = async (
  getToken: () => string | null
): Promise<ListAccountsResponse> => {
  const authenticatedFetch = getAuthenticatedFetch(getToken);
  const res = await authenticatedFetch('/api/ozon-personal-account/list');

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Failed to get accounts');
  }

  return res.json();
};

// Удаление аккаунта
const deleteAccount = async (
  id: number,
  getToken: () => string | null
): Promise<DeleteAccountResponse> => {
  const authenticatedFetch = getAuthenticatedFetch(getToken);
  const res = await authenticatedFetch(`/api/ozon-personal-account/${id}`, {
    method: 'DELETE',
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Failed to delete account');
  }

  return res.json();
};

const useCreateAccount = () => {
  const getToken = useGetToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAccountRequest) => createAccount(data, getToken),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ozon-accounts'] });
    },
  });
};

const useGetAccounts = () => {
  const getToken = useGetToken();

  return useQuery({
    queryKey: ['ozon-accounts'],
    queryFn: () => getAccounts(getToken),
  });
};

const useDeleteAccount = () => {
  const getToken = useGetToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteAccount(id, getToken),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ozon-accounts'] });
    },
  });
};

export const ozonPersonalAccountController = {
  useCreateAccount,
  useGetAccounts,
  useDeleteAccount,
};
