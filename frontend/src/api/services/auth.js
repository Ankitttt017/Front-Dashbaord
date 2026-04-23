import client from '../client';
export const login = (data) => client.post('/auth/login', data).then(r => r.data);
