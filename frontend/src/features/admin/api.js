import { api } from "@/lib/api";

export const adminApi = {
  session: () => api.get("/admin/session", { timeout: 45000 }),
  overview: (days = 30) => api.get("/admin/overview", { params: { days } }),
  users: (params) => api.get("/admin/users", { params }),
  user: (id) => api.get(`/admin/users/${id}`),
  userAction: (id, action) => api.post(`/admin/users/${id}/actions`, { action, confirmation: true }),
  userRole: (id, role) => api.patch(`/admin/users/${id}/role`, { role, confirmation: true }),
  subscriptions: (params) => api.get("/admin/subscriptions", { params }),
  support: (params) => api.get("/admin/support", { params }),
  supportTicket: (id) => api.get(`/admin/support/${id}`),
  updateSupport: (id, payload) => api.patch(`/admin/support/${id}`, payload),
  replySupport: (id, payload) => api.post(`/admin/support/${id}/messages`, payload),
  sync: (params) => api.get("/admin/trading-sync", { params }),
  syncRuns: (id) => api.get(`/admin/trading-sync/${id}/runs`),
  tradingAccounts: (params) => api.get("/admin/trading-accounts", { params }),
  integrations: (days = 30) => api.get("/admin/integrations", { params: { days } }),
  system: () => api.get("/admin/system"),
  propFirms: () => api.get("/admin/prop-firms"),
  savePropFirm: (item) => item.id
    ? api.put(`/admin/prop-firms/${item.id}`, item)
    : api.post("/admin/prop-firms", item),
  emails: (params) => api.get("/admin/emails", { params }),
  atlas: (days = 30) => api.get("/admin/atlas", { params: { days } }),
  backtesting: (days = 30) => api.get("/admin/backtesting", { params: { days } }),
  analytics: (days = 30) => api.get("/admin/analytics", { params: { days } }),
  announcements: () => api.get("/admin/announcements"),
  createAnnouncement: (payload) => api.post("/admin/announcements", { ...payload, confirmation: true }),
  saveAnnouncement: (id, payload) => api.put(`/admin/announcements/${id}`, { ...payload, confirmation: true }),
  flags: () => api.get("/admin/feature-flags"),
  saveFlag: (item) => item.id
    ? api.put(`/admin/feature-flags/${item.id}`, { ...item, confirmation: true })
    : api.post("/admin/feature-flags", { ...item, confirmation: true }),
  incidents: () => api.get("/admin/incidents"),
  updateIncident: (id, status) => api.patch(`/admin/incidents/${id}`, { status }),
  audit: (params) => api.get("/admin/audit-logs", { params }),
  settings: () => api.get("/admin/settings"),
  saveSetting: (key, value) => api.patch(`/admin/settings/${key}`, { value, confirmation: true }),
  search: (q) => api.get("/admin/search", { params: { q } }),
};

export const staffRoles = new Set(["support", "admin", "super_admin"]);
export const canAdmin = (user) => staffRoles.has(user?.role);
export const isSuperAdmin = (user) => user?.role === "super_admin";
