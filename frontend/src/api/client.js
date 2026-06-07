import axios from 'axios';
import { message } from 'antd';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach JWT Token automatically
client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Global Error Handling
client.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    const status = error.response ? error.response.status : null;
    const errorMsg = error.response?.data?.message || 'Something went wrong. Please try again.';

    if (status === 401) {
      // Unauthorized: clear credentials and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Prevent multiple alerts on page load
      if (!window.location.pathname.includes('/login')) {
        message.error('Session expired. Please log in again.');
        setTimeout(() => {
          window.location.href = '/login';
        }, 1500);
      }
    } else if (status === 403) {
      message.error(errorMsg || 'You are not authorized to perform this action.');
    } else if (status === 404) {
      // Let individual queries handle 404 if needed, otherwise display error
      console.warn('Resource not found:', error.config.url);
    } else {
      // General error fallback
      message.error(errorMsg);
    }

    return Promise.reject(error.response?.data || error);
  }
);

export default client;
