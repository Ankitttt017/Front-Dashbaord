import client from '../client';

export const listBoxes = (params) => client.get('/packing/boxes', { params }).then(r => r.data);
export const getBox = (boxNum) => client.get(`/packing/box/${boxNum}`).then(r => r.data);
export const getSettings = () => client.get('/packing/settings').then(r => r.data);
export const updateSettings = (data) => client.post('/packing/settings', data).then(r => r.data);
export const generateNextBox = () => client.post('/packing/generate-next').then(r => r.data);
export const triggerAutoPack = () => client.post('/packing/auto-pack').then(r => r.data);
export const getPackedBarcodes = () => client.get('/packing/packed-barcodes').then(r => r.data);
export const deleteBox = (id) => client.delete(`/packing/box/${id}`).then(r => r.data);
export const updateBox = (id, data) => client.patch(`/packing/box/${id}`, data).then(r => r.data);
// QA scanned endpoint removed from API
