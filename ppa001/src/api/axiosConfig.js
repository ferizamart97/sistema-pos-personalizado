import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Interceptor: añadir token JWT a cada petición
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('pos_admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor: redirigir al login si el token expiró
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !window.location.pathname.includes('/login')) {
      localStorage.removeItem('pos_admin_token');
      localStorage.removeItem('pos_admin_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
