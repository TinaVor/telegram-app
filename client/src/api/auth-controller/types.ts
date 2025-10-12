export type User = {
  id: number;
  telegram_id: string;
  first_name: string;
  last_name: string;
  username: string;
};

export type AuthResponse = {
  message?: string;
  token?: string;
  user?: User;
};

export type AuthContext = {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
};
