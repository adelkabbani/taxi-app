import axios from 'axios';

const api = axios.create({
    baseURL: '/api', // Proxy handles full URL
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add a request interceptor
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        const tenantOverride = localStorage.getItem('tenantOverride');

        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }

        if (tenantOverride) {
            config.headers['X-Tenant-Id'] = tenantOverride;
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add a response interceptor
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            // Token expired or invalid
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;
