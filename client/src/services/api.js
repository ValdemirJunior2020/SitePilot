import axios from 'axios';
import { auth } from './firebase';

const api = axios.create({
  baseURL: (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, ''),
  timeout: 45000,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && auth.currentUser && original && !original.__retried) {
      original.__retried = true;
      const token = await auth.currentUser.getIdToken(true);
      original.headers.Authorization = `Bearer ${token}`;
      return api(original);
    }
    return Promise.reject(error);
  }
);

export function apiError(error, fallback = 'Something went wrong.') {
  return error?.response?.data?.error || error?.message || fallback;
}

export default api;
