import client from '../client';

export const getTargets = () => client.get('/targets').then(r => r.data);
export const saveTarget = (data) => client.post('/targets', data).then(r => r.data);
export const deleteTarget = (id) => client.delete(`/targets/${id}`).then(r => r.data);
