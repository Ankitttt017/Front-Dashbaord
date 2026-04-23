import axios from 'axios';

const configuredBaseUrl = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');

const client = axios.create({
    baseURL: configuredBaseUrl,
    timeout: 30000,
});

client.interceptors.request.use(config => {
    const token = localStorage.getItem('tr_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

client.interceptors.response.use(
    res => res,
    err => {
        if (err?.response?.status === 401) {
            localStorage.removeItem('tr_token');
            window.location.href = '/login';
        }
        return Promise.reject(err);
    }
);

export default client;
