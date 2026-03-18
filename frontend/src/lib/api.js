import axios from 'axios';
import {
  MOCK_VESSELS, MOCK_JOBS, MOCK_QUOTES, MOCK_LEADS,
  MOCK_NOTIFICATIONS, MOCK_FILTERS,
} from './mockData';

const DEMO_MODE = !process.env.REACT_APP_BACKEND_URL;

// ── Mock helpers ─────────────────────────────────────────────────────────────

function filterVessels(vessels, { port, manager, owner, cert_status } = {}) {
  return vessels.filter(v => {
    if (port && port !== 'All') {
      const ports = port.split(',').map(p => p.trim());
      if (!ports.includes(v.port)) return false;
    }
    if (manager && manager !== 'All' && !v.ship_manager.includes(manager)) return false;
    if (owner && owner !== 'All' && !v.ship_owner.includes(owner)) return false;
    if (cert_status && cert_status !== 'All') {
      if (!v.certificates.some(c => c.status === cert_status)) return false;
    }
    return true;
  });
}

function filterJobs(jobs, { port, manager, owner } = {}) {
  return jobs.filter(j => {
    if (port && port !== 'All') {
      const ports = port.split(',').map(p => p.trim());
      if (!ports.includes(j.port)) return false;
    }
    if (manager && manager !== 'All' && !j.ship_manager.includes(manager)) return false;
    if (owner && owner !== 'All' && !j.ship_owner.includes(owner)) return false;
    return true;
  });
}

const mockSalesAPI = {
  getVessels: (port, tab = 'arriving', manager, owner, certStatus) => {
    let vessels = filterVessels(MOCK_VESSELS, { port, manager, owner, cert_status: certStatus });
    if (tab === 'overdue') vessels = vessels.filter(v => v.call_status === 'overdue');
    return Promise.resolve({ data: vessels.sort((a, b) => new Date(a.eta) - new Date(b.eta)) });
  },
  getQuotes: (port, manager, owner, certStatus) => {
    let filtered = MOCK_QUOTES.filter(q => {
      if (port && port !== 'All') { const ports = port.split(',').map(p => p.trim()); if (!ports.includes(q.port)) return false; }
      if (manager && manager !== 'All' && !q.ship_manager.includes(manager)) return false;
      if (owner && owner !== 'All' && !q.ship_owner.includes(owner)) return false;
      return true;
    });
    return Promise.resolve({ data: filtered });
  },
  getLeads: (port, manager, owner) => {
    let filtered = MOCK_LEADS.filter(l => {
      if (port && port !== 'All') { const ports = port.split(',').map(p => p.trim()); if (!ports.includes(l.port)) return false; }
      if (manager && manager !== 'All' && !l.ship_manager.includes(manager)) return false;
      return true;
    });
    return Promise.resolve({ data: filtered });
  },
  getStats: (port, manager, owner, certStatus) => {
    const vessels = filterVessels(MOCK_VESSELS, { port, manager, owner, cert_status: certStatus });
    const allVessels = filterVessels(MOCK_VESSELS, { port, manager, owner });
    const stats = {
      arriving_this_week: vessels.length,
      certificates_expiring: vessels.filter(v => v.certificates.some(c => ['critical', 'expired'].includes(c.status))).length,
      overdue_calls: vessels.filter(v => v.call_status === 'overdue').length,
      open_quotes: MOCK_QUOTES.filter(q => ['open', 'sent'].includes(q.status)).length,
      new_leads: MOCK_LEADS.length,
      cert_expired: allVessels.filter(v => v.certificates.some(c => c.status === 'expired')).length,
      cert_critical: allVessels.filter(v => v.certificates.some(c => c.status === 'critical')).length,
      cert_warning: allVessels.filter(v => v.certificates.some(c => c.status === 'warning')).length,
    };
    return Promise.resolve({ data: stats });
  },
  getPortCounts: () => {
    const counts = {};
    ['Mumbai', 'Kandla', 'Kochi', 'Tuticorin', 'Chennai', 'Vizag', 'Mundra'].forEach(p => {
      counts[p] = MOCK_VESSELS.filter(v => v.port === p).length;
    });
    return Promise.resolve({ data: counts });
  },
  markCalled: (id) => {
    const v = MOCK_VESSELS.find(v => v.id === id);
    if (v) v.call_status = 'called';
    return Promise.resolve({ data: { message: 'Call logged' } });
  },
  createQuote: (id) => Promise.resolve({ data: { message: 'Quote created' } }),
  assignEngineer: (id, engineer) => {
    const v = MOCK_VESSELS.find(v => v.id === id);
    if (v) v.assigned_engineer = engineer;
    return Promise.resolve({ data: { message: 'Engineer assigned' } });
  },
  addNote: (id, text) => {
    const v = MOCK_VESSELS.find(v => v.id === id);
    if (v) v.notes.push({ id: Date.now().toString(), text, created_at: new Date().toISOString() });
    return Promise.resolve({ data: { message: 'Note added' } });
  },
};

const mockOpsAPI = {
  getJobs: (port, manager, owner) => {
    const jobs = filterJobs(MOCK_JOBS, { port, manager, owner });
    return Promise.resolve({ data: jobs.sort((a, b) => new Date(a.eta) - new Date(b.eta)) });
  },
  updateJobStatus: (id, status) => {
    const j = MOCK_JOBS.find(j => j.id === id);
    if (j) j.status = status;
    return Promise.resolve({ data: { message: `Status updated to ${status}` } });
  },
  getFeed: (port, manager, owner) => {
    const vessels = filterVessels(MOCK_VESSELS, { port, manager, owner });
    const withJobs = vessels.map(v => ({ ...v, has_jobs: MOCK_JOBS.some(j => j.vessel_id === v.id) }));
    return Promise.resolve({ data: withJobs.sort((a, b) => new Date(a.eta) - new Date(b.eta)) });
  },
  getCertificates: (port, manager, owner) => {
    const vessels = filterVessels(MOCK_VESSELS, { port, manager, owner });
    const certs = [];
    vessels.forEach(v => {
      v.certificates.forEach(c => {
        if (['critical', 'expired', 'warning'].includes(c.status)) {
          certs.push({ vessel_name: v.name, vessel_id: v.id, port: v.port, cert_type: c.type, expiry_date: c.expiry_date, days_remaining: c.days_remaining, status: c.status });
        }
      });
    });
    return Promise.resolve({ data: certs.sort((a, b) => a.days_remaining - b.days_remaining) });
  },
  getStats: (port, manager, owner) => {
    const jobs = filterJobs(MOCK_JOBS, { port, manager, owner });
    const vessels = filterVessels(MOCK_VESSELS, { port, manager, owner });
    const stats = {
      total_jobs: jobs.length,
      pending: jobs.filter(j => j.status === 'pending').length,
      in_progress: jobs.filter(j => j.status === 'in_progress').length,
      completed: jobs.filter(j => j.status === 'completed').length,
      flagged: jobs.filter(j => j.status === 'flagged').length,
      urgent_certificates: vessels.filter(v => v.certificates.some(c => ['critical', 'expired'].includes(c.status))).length,
    };
    return Promise.resolve({ data: stats });
  },
};

// ── Real API (when backend is configured) ────────────────────────────────────

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

export const salesAPI = DEMO_MODE ? mockSalesAPI : {
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

export const opsAPI = DEMO_MODE ? mockOpsAPI : {
  getJobs: (port, manager, owner) => api.get('/ops/jobs', { params: { port, manager, owner } }),
  updateJobStatus: (id, status) => api.put(`/ops/jobs/${id}/status`, { status }),
  getFeed: (port, manager, owner) => api.get('/ops/feed', { params: { port, manager, owner } }),
  getCertificates: (port, manager, owner) => api.get('/ops/certificates', { params: { port, manager, owner } }),
  getStats: (port, manager, owner) => api.get('/ops/stats', { params: { port, manager, owner } }),
};

export const getNotifications = DEMO_MODE
  ? () => Promise.resolve({ data: MOCK_NOTIFICATIONS })
  : () => api.get('/notifications');

export const markNotificationRead = DEMO_MODE
  ? (id) => { const n = MOCK_NOTIFICATIONS.find(n => n.id === id); if (n) n.read = true; return Promise.resolve({ data: {} }); }
  : (id) => api.put(`/notifications/${id}/read`);

export const seedData = DEMO_MODE
  ? () => Promise.resolve({ data: { message: 'Demo mode — no backend needed' } })
  : () => api.post('/seed');

export const getFilters = DEMO_MODE
  ? () => Promise.resolve({ data: MOCK_FILTERS })
  : () => api.get('/filters');

export default api;
