import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true
});

let refreshTimeout;

export const getAuthToken = () => localStorage.getItem('token');

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem('token', token);
  } else {
    localStorage.removeItem('token');
  }
  scheduleRefresh(token);
}

function scheduleRefresh(token) {
  clearTimeout(refreshTimeout);
  if (!token) return;
  try {
    const { exp } = JSON.parse(atob(token.split('.')[1]));
    const delay = exp * 1000 - Date.now() - 60 * 1000;
    if (delay > 0) {
      refreshTimeout = setTimeout(async () => {
        try {
          await refreshToken();
        } catch {
          setAuthToken(null);
        }
      }, delay);
    }
  } catch {
    // ignore decoding errors
  }
}

scheduleRefresh(getAuthToken());

api.interceptors.request.use(config => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  res => res,
  async error => {
    const { response, config } = error;
    if (
      response &&
      response.status === 401 &&
      !config._retry &&
      config.url !== '/auth/refresh'
    ) {
      config._retry = true;
      try {
        await refreshToken();
        config.headers.Authorization = `Bearer ${getAuthToken()}`;
        return api(config);
      } catch (err) {
        setAuthToken(null);
        throw err;
      }
    }
    return Promise.reject(error);
  }
);

export const login = async (email, password) => {
  const { data } = await api.post('/auth/login', { email, password });
  setAuthToken(data.accessToken);
  return data;
};

export const register = async (email, password) => {
  const { data } = await api.post('/auth/register', { email, password });
  return data;
};

export async function refreshToken() {
  const { data } = await api.post('/auth/refresh');
  setAuthToken(data.accessToken);
  return data;
}

export const logout = async () => {
  await api.post('/auth/logout');
  setAuthToken(null);
};

export const getProfile = async () => {
  const { data } = await api.get('/users/me');
  return data;
};

export const uploadAvatar = async file => {
  const form = new FormData();
  form.append('avatar', file);
  const { data } = await api.post('/users/avatar', form);
  return data;
};

export const getUsers = async () => {
  const { data } = await api.get('/users');
  return data;
};

export const updateUserRole = async (id, role) => {
  const { data } = await api.patch(`/users/${id}/role`, { role });
  return data;
};

export const getSubscriptionStatus = async () => {
  const { data } = await api.get('/subscriptions/status');
  return data;
};

export const createCheckoutSession = async priceId => {
  const payload = priceId ? { priceId } : {};
  const { data } = await api.post('/subscriptions/checkout-session', payload);
  return data;
};

export const createBillingPortalSession = async () => {
  const { data } = await api.post('/subscriptions/portal-session');
  return data;
};

export default api;
