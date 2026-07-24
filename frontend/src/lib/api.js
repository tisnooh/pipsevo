import axios from "axios";
import { supabase } from "@/lib/supabase";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";
export const API = `${BACKEND_URL}/api`;
export const api = axios.create({ baseURL: API });

const response = (data) => ({ data });
const fail = (message, status = 400, original) => {
  const error = original instanceof Error ? original : new Error(message);
  error.response = { status, data: { detail: message } };
  return error;
};
const check = (error, fallback) => {
  if (error) throw fail(error.message || fallback, error.status || 400, error);
};
const numberOrNull = (value) => value === "" || value === undefined || value === null ? null : Number(value);
const numeric = (row, keys) => {
  const copy = { ...row };
  keys.forEach((key) => { if (copy[key] !== null && copy[key] !== undefined) copy[key] = Number(copy[key]); });
  return copy;
};
const currentAuthUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  check(error, "Session invalide");
  if (!user) throw fail("Tu dois être connecté.", 401);
  return user;
};

api.interceptors.request.use(async (cfg) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) cfg.headers.Authorization = `Bearer ${session.access_token}`;
  return cfg;
});
api.interceptors.response.use((value) => value, async (error) => {
  if (error.response?.status === 401) {
    await supabase.auth.signOut({ scope: "local" });
    localStorage.removeItem("pipsevo_token");
    window.dispatchEvent(new Event("pipsevo:session-expired"));
  }
  return Promise.reject(error);
});

const loadCurrentUser = async () => {
  const authUser = await currentAuthUser();
  const [{ data: profile, error: profileError }, { data: subscription, error: subscriptionError }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", authUser.id).single(),
    supabase.from("subscriptions").select("*").eq("user_id", authUser.id).maybeSingle(),
  ]);
  check(profileError, "Profil introuvable");
  check(subscriptionError, "Abonnement indisponible");
  return {
    ...profile,
    id: authUser.id,
    email: authUser.email || profile.email,
    plan: subscription?.plan || "free",
    subscription_status: subscription?.status || "inactive",
  };
};

export const auth = {
  register: async ({ email, password, name }) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(), password,
      options: { data: { name: name.trim() }, emailRedirectTo: `${window.location.origin}/login` },
    });
    check(error, "Inscription impossible");
    if (!data.session) return response({ token: null, user: null, requires_email_confirmation: true, email });
    return response({ token: data.session.access_token, user: await loadCurrentUser() });
  },
  login: async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    check(error, "E-mail ou mot de passe incorrect");
    return response({ token: data.session.access_token, user: await loadCurrentUser() });
  },
  me: async () => response(await loadCurrentUser()),
  update: async (values) => {
    const user = await currentAuthUser();
    const allowed = ["name", "trader_type", "prop_firms", "num_accounts", "onboarded", "rules", "journal_preferences", "app_preferences"];
    const payload = Object.fromEntries(Object.entries(values).filter(([key]) => allowed.includes(key)));
    const { error } = await supabase.from("profiles").update(payload).eq("id", user.id);
    check(error, "Impossible de sauvegarder le profil");
    return response(await loadCurrentUser());
  },
  logout: async () => {
    const { error } = await supabase.auth.signOut();
    check(error, "Déconnexion impossible");
    return response({ ok: true });
  },
  resetPassword: async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    check(error, "Impossible d’envoyer le lien de réinitialisation");
    return response({ ok: true });
  },
};

const accountNumbers = ["balance", "initial_balance", "profit_target", "max_drawdown", "daily_loss_limit", "current_drawdown"];
const enrichAccount = (value) => {
  const account = numeric(value, accountNumbers);
  const initial = Math.max(account.initial_balance || 1, 1);
  const balance = account.balance ?? initial;
  const maxDrawdown = Math.max(account.max_drawdown || 1, 1);
  const profitPct = (balance - initial) / initial;
  const drawdownRatio = Math.max(0, initial - balance) / maxDrawdown;
  return {
    ...account,
    health_score: Math.max(0, Math.min(100, Math.trunc(70 + profitPct * 100 - drawdownRatio * 60))),
    survival_score: Math.max(5, Math.min(99, Math.trunc(95 - drawdownRatio * 90))),
  };
};
const cleanAccount = (values) => {
  const allowed = ["name", "firm", "market_type", "balance", "initial_balance", "profit_target", "max_drawdown", "daily_loss_limit", "current_drawdown", "status"];
  const payload = Object.fromEntries(Object.entries(values).filter(([key]) => allowed.includes(key)));
  accountNumbers.forEach((key) => { if (key in payload) payload[key] = Number(payload[key] || 0); });
  return payload;
};

export const accounts = {
  list: async () => {
    const user = await currentAuthUser();
    const { data, error } = await supabase.from("accounts").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    check(error, "Impossible de charger les comptes");
    return response((data || []).map(enrichAccount));
  },
  create: async (values) => {
    const user = await currentAuthUser();
    const { data, error } = await supabase.from("accounts").insert({ ...cleanAccount(values), user_id: user.id }).select().single();
    check(error, "Impossible de créer le compte");
    return response(enrichAccount(data));
  },
  update: async (id, values) => {
    const user = await currentAuthUser();
    const { data, error } = await supabase.from("accounts").update(cleanAccount(values)).eq("id", id).eq("user_id", user.id).select().single();
    check(error, "Impossible de modifier le compte");
    return response(enrichAccount(data));
  },
  delete: async (id) => {
    const user = await currentAuthUser();
    const { error } = await supabase.from("accounts").delete().eq("id", id).eq("user_id", user.id);
    check(error, "Impossible de supprimer le compte");
    return response({ ok: true });
  },
};

const tradeNumbers = ["entry", "stop", "take_profit", "exit_price", "pnl", "r", "size", "duration_minutes", "point_value", "commission"];
const cleanTrade = (values) => {
  const allowed = ["account_id", "date", "instrument", "direction", "entry", "stop", "take_profit", "exit_price", "pnl", "result_status", "market_type", "setup", "setups", "session", "emotion", "emotion_secondary", "emotion_intensity", "notes", "plan_respected", "screenshots", "r", "size", "duration", "duration_minutes", "entry_time", "exit_time", "point_value", "commission", "mistakes", "exit_reason", "plan_exception_reason", "tags", "checklist_results", "starred"];
  const payload = Object.fromEntries(Object.entries(values).filter(([key]) => allowed.includes(key)));
  tradeNumbers.forEach((key) => { if (key in payload) payload[key] = numberOrNull(payload[key]); });
  ["entry_time", "exit_time"].forEach((key) => { if (payload[key] === "") payload[key] = null; });
  if (["open", "cancelled", "canceled"].includes(payload.result_status)) {
    payload.pnl = null;
    if (payload.result_status !== "open") payload.exit_price = null;
  }
  return payload;
};
const normalizeTrade = (value) => numeric(value, tradeNumbers);

export const trades = {
  list: async (accountId) => {
    const user = await currentAuthUser();
    let query = supabase.from("trades").select("*").eq("user_id", user.id).order("date", { ascending: false }).order("created_at", { ascending: false });
    if (accountId) query = query.eq("account_id", accountId);
    const { data, error } = await query;
    check(error, "Impossible de charger les trades");
    return response((data || []).map(normalizeTrade));
  },
  create: async (values) => {
    const user = await currentAuthUser();
    const { data, error } = await supabase.from("trades").insert({ ...cleanTrade(values), user_id: user.id }).select().single();
    check(error, "Impossible d’ajouter le trade");
    return response(normalizeTrade(data));
  },
  update: async (id, values) => {
    const user = await currentAuthUser();
    const { data, error } = await supabase.from("trades").update(cleanTrade(values)).eq("id", id).eq("user_id", user.id).select().single();
    check(error, "Impossible de modifier le trade");
    return response(normalizeTrade(data));
  },
  delete: async (id) => {
    const user = await currentAuthUser();
    const { error } = await supabase.from("trades").delete().eq("id", id).eq("user_id", user.id);
    check(error, "Impossible de supprimer le trade");
    return response({ ok: true });
  },
};

const normalizePayout = (value) => numeric(value, ["amount"]);
export const payouts = {
  list: async () => {
    const user = await currentAuthUser();
    const { data, error } = await supabase.from("payouts").select("*").eq("user_id", user.id).order("date", { ascending: false });
    check(error, "Impossible de charger les payouts");
    return response((data || []).map(normalizePayout));
  },
  create: async (values) => {
    const user = await currentAuthUser();
    const payload = { account_id: values.account_id, amount: Number(values.amount), date: values.date, note: values.note || null, user_id: user.id };
    const { data, error } = await supabase.from("payouts").insert(payload).select().single();
    check(error, "Impossible d’enregistrer le payout");
    return response(normalizePayout(data));
  },
  delete: async (id) => {
    const user = await currentAuthUser();
    const { error } = await supabase.from("payouts").delete().eq("id", id).eq("user_id", user.id);
    check(error, "Impossible de supprimer le payout");
    return response({ ok: true });
  },
};

const groupTrades = (rows, key) => {
  const result = {};
  rows.forEach((trade) => {
    const name = trade[key] || "Non renseigné";
    result[name] ||= { trades: 0, pnl: 0, wins: 0 };
    result[name].trades += 1;
    result[name].pnl += Number(trade.pnl || 0);
    if (Number(trade.pnl || 0) > 0) result[name].wins += 1;
  });
  Object.values(result).forEach((item) => { item.winrate = Math.round((item.wins / Math.max(item.trades, 1)) * 1000) / 10; });
  return result;
};
const buildDashboard = (accountRows, tradeRows, payoutRows) => {
  const initial = accountRows.reduce((sum, item) => sum + Number(item.initial_balance || 0), 0);
  const balance = accountRows.reduce((sum, item) => sum + Number(item.balance || 0), 0);
  const totalProfit = balance - initial;
  const remainingDrawdown = accountRows.reduce((sum, item) => sum + Math.max(0, Number(item.max_drawdown || 0) - Math.max(0, Number(item.initial_balance || 0) - Number(item.balance || 0))), 0);
  const wins = tradeRows.filter((item) => Number(item.pnl || 0) > 0);
  const losses = tradeRows.filter((item) => Number(item.pnl || 0) < 0);
  const winrate = tradeRows.length ? wins.length / tradeRows.length * 100 : 0;
  const planRate = tradeRows.length ? tradeRows.filter((item) => item.plan_respected).length / tradeRows.length * 100 : 100;
  const discipline = Math.max(0, Math.min(100, Math.trunc(planRate * 0.6 + winrate * 0.2 + 20)));
  const survival = accountRows.length ? Math.trunc(accountRows.reduce((sum, item) => sum + enrichAccount(item).survival_score, 0) / accountRows.length) : 100;
  let running = 0;
  const equity = [...tradeRows].sort((a, b) => String(a.date).localeCompare(String(b.date))).map((item) => ({ date: item.date, equity: Math.round((running += Number(item.pnl || 0)) * 100) / 100 }));
  const setups = groupTrades(tradeRows, "setup");
  const sessions = groupTrades(tradeRows, "session");
  const setupNames = Object.keys(setups);
  const sum = (rows) => rows.reduce((total, item) => total + Number(item.pnl || 0), 0);
  return {
    kpis: {
      funded_capital: initial, total_profit: totalProfit, remaining_drawdown: remainingDrawdown,
      estimated_payout: Math.max(0, totalProfit * 0.8), discipline_score: discipline,
      trader_score: Math.trunc((discipline + survival + Math.max(0, Math.min(100, winrate))) / 3),
      survival_score: survival, total_payouts: payoutRows.reduce((total, item) => total + Number(item.amount || 0), 0),
      active_accounts: accountRows.filter((item) => item.status === "active").length, total_trades: tradeRows.length,
    },
    equity_curve: equity.slice(-180),
    metrics: {
      winrate: Math.round(winrate * 10) / 10,
      profit_factor: losses.length ? Math.round((sum(wins) / Math.abs(sum(losses))) * 100) / 100 : 0,
      avg_win: wins.length ? Math.round(sum(wins) / wins.length * 100) / 100 : 0,
      avg_loss: losses.length ? Math.round(sum(losses) / losses.length * 100) / 100 : 0,
      plan_respect_rate: Math.round(planRate * 10) / 10,
    },
    setups, sessions,
    best_setup: setupNames.length ? setupNames.reduce((best, name) => setups[name].pnl > setups[best].pnl ? name : best) : null,
    worst_setup: setupNames.length ? setupNames.reduce((worst, name) => setups[name].pnl < setups[worst].pnl ? name : worst) : null,
  };
};

export const dashboard = async () => {
  const [accountResponse, tradeResponse, payoutResponse] = await Promise.all([accounts.list(), trades.list(), payouts.list()]);
  return response(buildDashboard(accountResponse.data, tradeResponse.data, payoutResponse.data));
};
export const dna = async () => {
  const { data: rows } = await trades.list();
  if (!rows.length) return response({ trader_type: "Untested", best_session: null, best_setup: null, best_conditions: "Insufficient data" });
  const totals = (key) => rows.reduce((result, item) => ({ ...result, [item[key] || "?"]: (result[item[key] || "?"] || 0) + Number(item.pnl || 0) }), {});
  const best = (values) => Object.keys(values).reduce((winner, key) => values[key] > values[winner] ? key : winner);
  const sessions = totals("session"), setups = totals("setup"), emotions = totals("emotion");
  const average = rows.reduce((sum, item) => sum + Number(item.pnl || 0), 0) / rows.length;
  return response({
    trader_type: rows.length < 50 && average > 0 ? "Sniper" : rows.length >= 100 ? "Volume Trader" : "Developing",
    best_session: best(sessions), best_setup: best(setups), best_emotion: best(emotions), trades_logged: rows.length,
  });
};
export const onboarding = (values) => auth.update({ ...values, onboarded: true });

export const coach = {
  ask: (question, tag) => api.post("/coach/ask", { question, context_tag: tag || "overall" }),
  history: async () => {
    const user = await currentAuthUser();
    const { data, error } = await supabase.from("ai_reports").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);
    check(error, "Impossible de charger les analyses");
    return response(data || []);
  },
};
export const billing = { checkout: (plan = "pro") => api.post("/billing/checkout", null, { params: { plan } }) };
export const contact = async (values) => {
  const { error } = await supabase.from("contact_messages").insert({ ...values, status: "new" });
  check(error, "Impossible d’envoyer le message");
  return response({ ok: true });
};

export const tradeScreenshots = {
  upload: async (tradeId, file) => {
    const user = await currentAuthUser();
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user.id}/${tradeId}/${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage.from("trade-screenshots").upload(path, file, { upsert: false });
    check(error, "Impossible d’envoyer la capture");
    return path;
  },
  signedUrl: async (path, expiresIn = 3600) => {
    const { data, error } = await supabase.storage.from("trade-screenshots").createSignedUrl(path, expiresIn);
    check(error, "Impossible de lire la capture");
    return data.signedUrl;
  },
  delete: async (paths) => {
    const { error } = await supabase.storage.from("trade-screenshots").remove(paths);
    check(error, "Impossible de supprimer la capture");
    return response({ ok: true });
  },
};
