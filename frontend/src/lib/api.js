import axios from 'axios';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

export const salesAPI = {
  getVessels: (port, tab = 'arriving', manager, owner, certStatus) => api.get('/sales/vessels', { params: { port, tab, manager, owner, cert_status: certStatus } }),
  getQuotes: (port, manager, owner, certStatus) => api.get('/sales/quotes', { params: { port, manager, owner, cert_status: certStatus } }),
  getLeads: (port, manager, owner, certStatus) => api.get('/sales/leads', { params: { port, manager, owner, cert_status: certStatus } }),
  getStats: (port, manager, owner, certStatus) => api.get('/sales/stats', { params: { port, manager, owner, cert_status: certStatus } }),
  getPortCounts: () => api.get('/sales/port-counts'),
  markCalled: (id) => api.post(`/sales/vessels/${id}/call`),
  createQuote: (id) => api.post(`/sales/vessels/${id}/quote`),
  assignEngineer: (id, engineer) => api.post(`/sales/vessels/${id}/assign`, { engineer }),
  addNote: (id, text) => api.post(`/sales/vessels/${id}/note`, { text }),
};

export const opsAPI = {
  getJobs: (port, manager, owner) => api.get('/ops/jobs', { params: { port, manager, owner } }),
  updateJobStatus: (id, status) => api.put(`/ops/jobs/${id}/status`, { status }),
  getFeed: (port, manager, owner) => api.get('/ops/feed', { params: { port, manager, owner } }),
  getCertificates: (port, manager, owner) => api.get('/ops/certificates', { params: { port, manager, owner } }),
  getStats: (port, manager, owner) => api.get('/ops/stats', { params: { port, manager, owner } }),
};

export const getNotifications = () => api.get('/notifications');
export const markNotificationRead = (id) => api.put(`/notifications/${id}/read`);
export const seedData = () => api.post('/seed');
export const getFilters = () => api.get('/filters');

export default api;
