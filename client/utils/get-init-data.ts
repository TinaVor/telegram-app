import WebApp from '@twa-dev/sdk';

const parseInitData = (data: string): Record<string, any> => {
  const params = new URLSearchParams(data);
  const result: Record<string, any> = {};
  for (const [key, value] of params) {
    if (key === 'user') {
      result.user = JSON.parse(decodeURIComponent(value));
    } else if (key === 'auth_date') {
      result.auth_date = parseInt(value, 10);
    } else {
      result[key] = decodeURIComponent(value);
    }
  }
  return result;
};

export const getInitData = (): Record<string, any> | null => {
  const isDev = import.meta.env.DEV;
  const raw = isDev
    ? import.meta.env.VITE_MOCK_INIT_DATA
    : WebApp.initData;

  // console.log('getInitData: DEV mode =', isDev);
  // console.log('getInitData: raw data =', raw);

  if (raw) {
    const parsed = parseInitData(raw);
    // console.log('getInitData: parsed data =', parsed);
    return parsed;
  }
  // console.log('getInitData: no raw data, returning null');
  return null;
};
