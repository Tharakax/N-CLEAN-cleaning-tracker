import axios from 'axios';

const API = axios.create({ baseURL: '/api' });

// Attach JWT token to every request automatically
API.interceptors.request.use((config) => {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  if (user?.token) {
    config.headers.Authorization = `Bearer ${user.token}`;
  }
  return config;
});

export default API;
