const API_BASE = '/api';

export const login = async (email, password) => {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    credentials: 'include'
  });
  if (!res.ok) throw new Error('Login failed');
  return res.json();
};

export const register = async (email, password) => {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) throw new Error('Register failed');
  return res.json();
};

export const refreshToken = async () => {
  const res = await fetch(`${API_BASE}/auth/refresh`, { method: 'POST', credentials: 'include' });
  if (!res.ok) throw new Error('Refresh failed');
  return res.json();
};

export const getProfile = async (token) => {
  const res = await fetch(`${API_BASE}/users/me`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Fetch failed');
  return res.json();
};

export const uploadAvatar = async (token, file) => {
  const form = new FormData();
  form.append('avatar', file);
  const res = await fetch(`${API_BASE}/users/avatar`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: form
  });
  if (!res.ok) throw new Error('Upload failed');
  return res.json();
};
