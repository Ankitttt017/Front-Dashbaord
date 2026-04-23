import client from '../client';
export const getSystemStatus = () => client.get('/system/status').then(r => r.data);
