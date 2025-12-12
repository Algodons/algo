import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Enable sending cookies
});

// Note: Token should be stored in httpOnly cookies for security
// This is a fallback for development. In production, use httpOnly cookies.
apiClient.interceptors.request.use((config) => {
  // Token will be automatically sent via httpOnly cookies
  // This localStorage fallback is only for development
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export default apiClient;
