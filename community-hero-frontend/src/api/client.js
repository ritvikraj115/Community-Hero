import axios from 'axios';

const trimTrailingSlash = (value) => value.replace(/\/+$/, '');

const resolveApiBase = () => {
  const explicitApiBase = process.env.REACT_APP_API_BASE?.trim();
  const backendUrl = process.env.REACT_APP_BACKEND_URL?.trim();

  if (explicitApiBase) return trimTrailingSlash(explicitApiBase);
  if (backendUrl) return `${trimTrailingSlash(backendUrl)}/api`;

  throw new Error('REACT_APP_API_BASE or REACT_APP_BACKEND_URL is required.');
};

const API_BASE = resolveApiBase();

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.clear();
      window.dispatchEvent(new Event('auth-updated'));
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export { API_BASE };
export default api;
