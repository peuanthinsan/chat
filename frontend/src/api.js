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

export const login = async (identifier, password) => {
  const { data } = await api.post('/auth/login', { identifier, password });
  setAuthToken(data.accessToken);
  return data;
};

export const register = async ({ email, password, username, firstName, lastName, avatar }) => {
  const form = new FormData();
  form.append('email', email);
  form.append('password', password);
  form.append('username', username);
  if (typeof firstName === 'string' && firstName.trim()) {
    form.append('firstName', firstName.trim());
  }
  if (typeof lastName === 'string' && lastName.trim()) {
    form.append('lastName', lastName.trim());
  }
  if (avatar) {
    form.append('avatar', avatar);
  }
  const { data } = await api.post('/auth/register', form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
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

export const updateProfile = async updates => {
  const { data } = await api.patch('/users/me', updates);
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

export const deleteUser = async id => {
  const { data } = await api.delete(`/users/${id}`);
  return data;
};

export const getSubscriptionPlan = async () => {
  const { data } = await api.get('/billing/plan');
  return data;
};

export const createCheckoutSession = async () => {
  const { data } = await api.post('/billing/checkout-session');
  return data;
};

export const createPortalSession = async () => {
  const { data } = await api.post('/billing/portal-session');
  return data;
};

export default api;
