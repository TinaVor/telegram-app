// Функция для создания кастомного fetch, не зависит от React
const createAuthenticatedFetch = (getToken: () => string | null) => {
  return async (url: RequestInfo | URL, init?: RequestInit) => {
    const token = getToken();

    // console.log('createAuthenticatedFetch: URL =', typeof url === 'string' ? url : url.toString());
    // console.log('createAuthenticatedFetch: token =', token ? 'present' : 'null');

    // Не добавляем токен к запросам на /api/auth
    if (typeof url === 'string' && url.includes('/api/auth')) {
      // console.log('createAuthenticatedFetch: skipping auth header for /api/auth request');
      return fetch(url, init);
    }

    if (token && init) {
      // console.log('createAuthenticatedFetch: adding auth header with init.headers');
      init.headers = {
        ...init.headers,
        Authorization: `Bearer ${token}`,
      };
    } else if (token) {
      // console.log('createAuthenticatedFetch: adding auth header creating init');
      init = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        ...init,
      };
    } else {
      // console.log('createAuthenticatedFetch: no token to add');
    }

    // console.log('createAuthenticatedFetch: final headers =', init?.headers);
    return fetch(url, init);
  };
};

export { createAuthenticatedFetch };
