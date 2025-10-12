import React, { createContext, useContext, useEffect, useState } from 'react';
import { AuthContext, User } from '../../api/auth-controller/types';
import { authController } from '../../api/auth-controller/auth-controller';
import { getInitData } from '../../../utils/get-init-data';

const AuthContextProvider = createContext<AuthContext | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContextProvider);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

type AuthProviderProps = {
  children: React.ReactNode;
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem('auth_token')
  );
  const [user, setUser] = useState<User | null>(() =>
    token ? JSON.parse(localStorage.getItem('auth_user') || 'null') : null
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const initData = getInitData();
  const {
    data,
    isLoading: queryLoading,
    error: queryError,
  } = authController.useCreateOrLoginUser();

  useEffect(() => {
    // console.log('AuthProvider: useEffect triggered');
    // console.log('AuthProvider: initData =', initData);

    if (!initData) {
      // console.log('AuthProvider: no initData, setting error');
      setIsLoading(false);
      setError('Запускайте из Telegram!');
      return;
    }

    if (queryLoading) {
      // console.log('AuthProvider: query loading');
      setIsLoading(true);
      return;
    }

    if (queryError) {
      console.log('AuthProvider: auth error =', queryError);
      setIsLoading(false);
      setError('Ошибка авторизации');
      return;
    }

    if (data && data.token && data.user) {
      // console.log('AuthProvider: setting token and user');
      setToken(data.token);
      setUser(data.user);
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('auth_user', JSON.stringify(data.user));
      setIsLoading(false);
      setError(null);
    }
  }, [data, initData, queryLoading, queryError]);

  const isAuthenticated = !!token && !!user;

  const contextValue: AuthContext = {
    token,
    user,
    isAuthenticated,
    isLoading,
    error,
  };

  return (
    <AuthContextProvider.Provider value={contextValue}>
      {children}
    </AuthContextProvider.Provider>
  );
};
