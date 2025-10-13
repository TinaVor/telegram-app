// Функция для создания кастомного fetch, не зависит от React
const createAuthenticatedFetch = (getToken: () => string | null) => {
  return async (url: RequestInfo | URL, init?: RequestInit) => {
    const token = getToken();

    // Не добавляем токен к запросам на /api/auth
    if (typeof url === 'string' && url.includes('/api/auth')) {
      return fetch(url, init);
    }

    if (token && init) {
      init.headers = {
        ...init.headers,
        Authorization: `Bearer ${token}`,
      };
    } else if (token) {
      init = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        ...init,
      };
    }

    return fetch(url, init);
  };
};

export { createAuthenticatedFetch };
