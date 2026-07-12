import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API });

api.interceptors.request.use((cfg) => {
  const t = localStorage.getItem("pipsevo_token");
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

export const auth = {
  register: (data) => api.post("/auth/register", data),
  login: (data) => api.post("/auth/login", data),
  me: () => api.get("/auth/me"),
  update: (data) => api.patch("/auth/me", data),
};

export const accounts = {
  list: () => api.get("/accounts"),
  create: (data) => api.post("/accounts", data),
  delete: (id) => api.delete(`/accounts/${id}`),
};

export const trades = {
  list: (account_id) => api.get("/trades", { params: account_id ? { account_id } : {} }),
  create: (data) => api.post("/trades", data),
  delete: (id) => api.delete(`/trades/${id}`),
};

export const payouts = {
  list: () => api.get("/payouts"),
  create: (data) => api.post("/payouts", data),
};

export const dashboard = () => api.get("/dashboard");
export const dna = () => api.get("/dna");
export const onboarding = (data) => api.post("/onboarding", data);
export const coach = {
  ask: (question, tag) => api.post("/coach/ask", { question, context_tag: tag || "overall" }),
  history: () => api.get("/coach/history"),
};
export const billing = {
  checkout: (plan = "pro") => api.post("/billing/checkout", null, { params: { plan } }),
};
