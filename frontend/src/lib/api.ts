/**
 * Axios API client for communicating with the FastAPI backend.
 * Handles JWT token management and automatic refresh.
 */

import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
  withCredentials: true,
});

// Request interceptor: No longer needed for Bearer tokens since cookies are auto-sent
api.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error)
);

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

// Response interceptor: automatically trap 401 and attempt backend refresh cookie rotation
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Avoid retry loop dynamically
    if (error.response?.status === 401 && !originalRequest._retry && originalRequest.url !== '/auth/refresh') {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => api(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      return new Promise(async (resolve, reject) => {
        try {
          // Attempt rotation of HTTP Cookies natively 
          await api.post('/auth/refresh');
          processQueue(null);
          resolve(api(originalRequest));
        } catch (refreshError) {
          processQueue(refreshError);
          if (typeof window !== 'undefined') {
            localStorage.removeItem('user');
            window.location.href = '/login';
          }
          reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      });
    }
    return Promise.reject(error);
  }
);

// ─────────────────────────────────────────
// Auth APIs
// ─────────────────────────────────────────
export const authAPI = {
  oauth: (data: { email: string; name: string; provider: string }) =>
    api.post('/auth/oauth', data),

  getProfile: () => api.get('/auth/me'),

  refresh: () => api.post('/auth/refresh'),
  
  logout: () => api.post('/auth/logout'),
};

// ─────────────────────────────────────────
// Project APIs
// ─────────────────────────────────────────
export const projectAPI = {
  create: (data: { name: string; description?: string; repo_url?: string; source_type?: string }) =>
    api.post('/projects', data),

  list: (skip = 0, limit = 50) =>
    api.get('/projects', { params: { skip, limit } }),

  get: (id: string) => api.get(`/projects/${id}`),

  delete: (id: string) => api.delete(`/projects/${id}`),
};

// ─────────────────────────────────────────
// Deployment APIs
// ─────────────────────────────────────────
export const deployAPI = {
  deploy: (projectId: string) =>
    api.post('/deploy', { project_id: projectId }),

  getStatus: (deploymentId: string) =>
    api.get(`/deploy/${deploymentId}`),

  getLogs: (deploymentId: string, tail = 100) =>
    api.get(`/deploy/${deploymentId}/logs`, { params: { tail } }),

  stop: (deploymentId: string) =>
    api.post(`/deploy/${deploymentId}/stop`),

  listForProject: (projectId: string) =>
    api.get(`/deploy/project/${projectId}`),
};

// ─────────────────────────────────────────
// AI APIs
// ─────────────────────────────────────────
export const aiAPI = {
  analyze: (deploymentId: string, additionalContext?: string) =>
    api.post('/ai/analyze', {
      deployment_id: deploymentId,
      additional_context: additionalContext,
    }),

  getSuggestions: (deploymentId: string) =>
    api.get(`/ai/suggestions/${deploymentId}`),

  validateFix: (commands: string[]) =>
    api.post('/ai/validate-fix', commands),

  getBlueprint: (projectId: string) =>
    api.get(`/ai/architect/${projectId}`),
};

// ─────────────────────────────────────────
// Synchronous Testing APIs
// ─────────────────────────────────────────
export const syncAPI = {
  deploy: (repoUrl: string) =>
    api.post('/deploy/sync', { repo_url: repoUrl }),

  getLogs: (projectId: string) =>
    api.get(`/deploy/${projectId}/logs`),

  analyzeAi: (projectId: string) =>
    api.post('/ai/analyze', { project_id: projectId }),
};

// ─────────────────────────────────────────
// Billing APIs
// ─────────────────────────────────────────
export const billingAPI = {
  checkout: () => api.post('/billing/checkout'),
  getStatus: () => api.get('/billing/status'),
};

export default api;
