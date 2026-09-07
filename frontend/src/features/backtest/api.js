import { api } from "@/lib/api";

const root = "/backtest";
export const labApi = {
  catalog: () => api.get(`${root}/catalog`).then(r => r.data),
  datasets: () => api.get(`${root}/datasets`).then(r => r.data),
  upload: data => api.post(`${root}/datasets`, data).then(r => r.data),
  sessions: () => api.get(`${root}/sessions`).then(r => r.data),
  create: data => api.post(`${root}/sessions`, data).then(r => r.data),
  session: id => api.get(`${root}/sessions/${id}`).then(r => r.data),
  bars: (id, before) => api.get(`${root}/sessions/${id}/bars`, { params: before === undefined ? {} : { before } }).then(r => r.data),
  command: (id, revision, action, payload = {}) => api.post(`${root}/sessions/${id}/commands`, { revision, action, payload }).then(r => r.data),
  strategies: () => api.get(`${root}/strategies`).then(r => r.data),
  createStrategy: body => api.post(`${root}/strategies`, body).then(r => r.data),
};
export const errorText = error => typeof error.response?.data?.detail === "string"
  ? error.response.data.detail : "Opération impossible. Vérifie la connexion et les champs, puis réessaie.";
export const usd = value => value === null || value === undefined ? "—" : new Intl.NumberFormat("fr-FR", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(Number(value));
