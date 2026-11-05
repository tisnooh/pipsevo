import axios from "axios";
import { supabase, SUPABASE_AUTH_STORAGE_KEY } from "@/lib/supabase";
import { AUTH_CONFIG } from "@/config/auth";
import { notifyAppDataChanged } from "@/lib/appDataEvents";
import { measuredTradePnl } from "@/lib/tradeAnalytics";
import { MAX_TRADE_SCREENSHOT_BYTES, TRADE_SCREENSHOT_TYPES } from "@/lib/tradeMedia";
import { fetchOwnedTradeHistory } from "@/lib/ownedTradeHistory";
import { clockInput, finiteInput, accountFinancialPayload, validateTradeCurrency } from "@/lib/financialPayloads";
import { tradeFingerprint, tradeIdentityKeys, isDuplicateTradeImport } from "@/lib/tradeCsvImport";
import { resolveAccountDrawdown } from "@/lib/riskEngine";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";
export const API = `${BACKEND_URL}/api`;
export const api = axios.create({ baseURL: API });

const response = (data) => ({ data });
const fail = (message, status = 400, original) => {
  const error = original instanceof Error ? original : new Error(message);
  if (original?.code) error.code = original.code;
  error.response = { status, data: { detail: message } };
  return error;
};
const check = (error, fallback) => {
  if (!error) return;
  const authMessages = {
    over_email_send_rate_limit: "Le quota temporaire d'e-mails est atteint. Réessaie dans environ une heure.",
    email_address_invalid: "Cette adresse e-mail n'est pas acceptée. Vérifie-la ou utilise une autre adresse.",
    user_already_exists: "Un compte existe déjà avec cette adresse e-mail.",
    weak_password: "Ce mot de passe est trop faible. Utilise au moins 8 caractères, une majuscule et un chiffre.",
  };
  const message = authMessages[error.code] || error.message || fallback;
  throw fail(message, error.status || (error.code === "over_email_send_rate_limit" ? 429 : 400), error);
};
const removeLocalStorage = key => { try { localStorage.removeItem(key); } catch { /* Storage can be disabled. */ } };
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
  cfg.headers ||= {};
  if (session?.access_token) cfg.headers.Authorization = `Bearer ${session.access_token}`;
  return cfg;
});
api.interceptors.response.use((value) => value, async (error) => {
  const detail = error.response?.data?.detail;
  const isBusinessError = detail && typeof detail === "object" && Boolean(detail.code);
  if (error.response?.status === 401 && !isBusinessError) {
    const headers = error.config?.headers;
    const authorization = headers?.get?.("Authorization") || headers?.Authorization || headers?.authorization;
    const requestToken = typeof authorization === "string" && authorization.startsWith("Bearer ") ? authorization.slice(7) : null;
    // An old request (or a public request) must not sign out a newer session.
    if (requestToken) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token === requestToken) {
          try { await supabase.auth.signOut({ scope: "local" }); } catch { /* The rejected session must still be hidden. */ }
          removeLocalStorage("pipsevo_token");
          window.dispatchEvent(new Event("pipsevo:session-expired"));
        }
      } catch { /* Preserve the original request error if session storage fails. */ }
    }
  }
  return Promise.reject(error);
});

const wait = (duration) => new Promise((resolve) => window.setTimeout(resolve, duration));

const loadCurrentUserOnce = async () => {
  const authUser = await currentAuthUser();
  const [{ data: profile, error: profileError }, { data: subscription, error: subscriptionError }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", authUser.id).maybeSingle(),
    supabase.from("subscriptions").select("*").eq("user_id", authUser.id).maybeSingle(),
  ]);
  check(profileError, "Profil introuvable");
  if (!profile) throw fail("Le profil est encore en cours de création.", 503);
  if (profile.id !== authUser.id) throw fail("Le profil reçu ne correspond pas à ta session.", 503);
  check(subscriptionError, "Abonnement indisponible");
  if (subscription && subscription.user_id !== authUser.id) throw fail("L’abonnement reçu ne correspond pas à ta session.", 503);
  const onboardingCompleted = Boolean(profile.onboarding_completed ?? profile.onboarded);
  return {
    ...profile,
    id: authUser.id,
    email: authUser.email || profile.email,
    onboarding_completed: onboardingCompleted,
    // Alias conservé pendant la transition de l'ancien schéma.
    onboarded: onboardingCompleted,
    plan: subscription?.plan || "free",
    subscription_status: subscription?.status || "inactive",
    current_period_end: subscription?.current_period_end || null,
    joined_during_beta: subscription?.joined_during_beta || false,
    launch_offer_eligible: subscription?.launch_offer_eligible || false,
    launch_offer_used: subscription?.launch_offer_used || false,
    subscription_started_at: subscription?.subscription_started_at || null,
    launch_offer_expires_at: subscription?.launch_offer_expires_at || null,
    cancel_at_period_end: subscription?.cancel_at_period_end || false,
  };
};

const loadCurrentUser = async ({ retries = 0 } = {}) => {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await loadCurrentUserOnce();
    } catch (error) {
      lastError = error;
      if (attempt < retries) await wait(120 * (attempt + 1));
    }
  }
  throw lastError;
};

export const auth = {
  register: async ({ email, password, name, language = "fr" }) => {
    try {
      const settings = await api.get("/settings/public");
      if (settings.data?.maintenance_mode || settings.data?.registration_enabled === false) {
        throw fail(settings.data?.maintenance_mode ? "PipsEvo est temporairement en maintenance." : "Les inscriptions sont temporairement fermées.", 503);
      }
    } catch (error) {
      if (error.response?.status === 503) throw error;
      // Une panne de lecture des réglages ne doit pas inventer une fermeture.
    }
    const cleanEmail = email.trim();
    const displayName = name.trim();
    const options = {
      data: { display_name: displayName, onboarding_completed: false, language: language === "en" ? "en" : "fr" },
    };
    if (AUTH_CONFIG.requireEmailConfirmation) {
      options.emailRedirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(AUTH_CONFIG.postSignUpPath)}`;
    }
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options,
    });
    check(error, "Inscription impossible");
    if (!data.session) {
      if (!AUTH_CONFIG.requireEmailConfirmation) {
        throw fail("La confirmation e-mail est encore active dans Supabase. La configuration bêta doit être synchronisée.", 503);
      }
      return response({ token: null, user: null, requires_email_confirmation: true, email: cleanEmail });
    }
    return response({ token: data.session.access_token, user: await loadCurrentUser({ retries: 5 }) });
  },
  resendConfirmation: async (email) => {
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(AUTH_CONFIG.postSignUpPath)}` },
    });
    check(error, "Impossible de renvoyer l'e-mail de confirmation");
    return response({ ok: true });
  },
  login: async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    check(error, "E-mail ou mot de passe incorrect");
    return response({ token: data.session.access_token, user: await loadCurrentUser({ retries: 3 }) });
  },
  me: async () => response(await loadCurrentUser({ retries: 3 })),
  update: async (values) => {
    const user = await currentAuthUser();
    const allowed = ["name", "trader_type", "prop_firms", "num_accounts", "onboarded", "onboarding_completed", "rules", "journal_preferences", "app_preferences", "trading_plan"];
    const payload = Object.fromEntries(Object.entries(values).filter(([key]) => allowed.includes(key)));
    const { data: updated, error } = await supabase.from("profiles").update(payload).eq("id", user.id).select("id").single();
    check(error, "Impossible de sauvegarder le profil");
    if (updated?.id !== user.id) throw fail("Le profil n’a pas été sauvegardé. Recharge ta session avant de réessayer.", 503);
    const current = await currentAuthUser();
    if (current.id !== user.id) throw fail("Le profil a été sauvegardé sur le compte initial, mais ta session a changé. Recharge les paramètres du compte actuel.", 409);
    const metadata = {};
    if (payload.name) metadata.display_name = payload.name;
    if ("onboarding_completed" in payload) metadata.onboarding_completed = Boolean(payload.onboarding_completed);
    if (Object.keys(metadata).length) {
      const { error: metadataError } = await supabase.auth.updateUser({ data: metadata });
      check(metadataError, "Le profil a été sauvegardé, mais ses métadonnées n'ont pas pu être synchronisées");
    }
    const refreshed = await loadCurrentUser({ retries: 2 });
    if (refreshed.id !== user.id) throw fail("Ta session a changé pendant la sauvegarde. Recharge les paramètres du compte actuel.", 409);
    return response(refreshed);
  },
  logout: async (scope = "local") => {
    const { error } = await supabase.auth.signOut({ scope });
    check(error, "Déconnexion impossible");
    return response({ ok: true });
  },
  resetPassword: async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
    check(error, "Impossible d’envoyer le lien de réinitialisation");
    return response({ ok: true });
  },
  updatePassword: async (password) => {
    const { error } = await supabase.auth.updateUser({ password });
    check(error, "Impossible de modifier le mot de passe");
    return response({ ok: true });
  },
  sendWelcome: async (locale = "fr") => api.post("/email/welcome", { locale: locale === "en" ? "en" : "fr" }),
  signOutOtherSessions: async () => {
    const { error } = await supabase.auth.signOut({ scope: "others" });
    check(error, "Impossible de déconnecter les autres appareils");
    return response({ ok: true });
  },
  deleteAccount: async (confirmation) => {
    if (confirmation !== "SUPPRIMER") throw fail("Confirmation invalide.", 422);
    const { data } = await api.post("/account/delete", { confirmation });
    if (!data?.ok) throw fail(data?.error || "Impossible de supprimer le compte", 400);

    // Le compte n'existe plus : l'API Auth peut donc répondre 403 au sign-out.
    // La clé est celle configurée par PipsEvo dans le client Supabase.
    try { await supabase.auth.signOut({ scope: "local" }); } catch { /* Auth is already disabled. */ }
    removeLocalStorage(SUPABASE_AUTH_STORAGE_KEY);
    return response(data);
  },
};

const accountNumbers = ["balance", "initial_balance", "profit_target", "max_drawdown", "daily_loss_limit", "current_drawdown"];
const enrichAccount = (value) => {
  const account = numeric(value, accountNumbers);
  const risk = resolveAccountDrawdown(account, { allowStaticEstimate: !account.integration_account_id });
  const initial = Number(account.initial_balance);
  const scoreAvailable = account.currency_available !== false && initial > 0 && Number.isFinite(account.balance) && risk;
  const profitPct = scoreAvailable ? (account.balance - initial) / initial : null;
  const drawdownRatio = risk ? Math.min(1, risk.drawdownUsed / risk.maxDrawdown) : null;
  return {
    ...account,
    health_score: scoreAvailable ? Math.max(0, Math.min(100, Math.trunc(70 + profitPct * 100 - drawdownRatio * 60))) : null,
    survival_score: scoreAvailable ? Math.max(5, Math.min(99, Math.trunc(95 - drawdownRatio * 90))) : null,
  };
};
const ownedAccounts = async (userId) => {
  const [rows, linked] = await Promise.all([fetchAllOwnedRows("accounts", userId), fetchAllOwnedRows("integration_accounts", userId)]);
  return rows.map(row => {
    const providers = linked.filter(item => item.account_id === row.id);
    const currencies = [...new Set(providers.map(item => String(item.currency || "").toUpperCase()).filter(Boolean))];
    const native = String(row.provider_currency || row.currency || "").trim().toUpperCase();
    const nativeAvailable = row.currency_available !== false && Boolean(native || !(row.source_provider || row.integration_account_id));
    return enrichAccount(providers.length ? { ...row, integration_account_id: providers[0].id, source_provider: providers[0].provider,
      currency: currencies.length === 1 ? currencies[0] : null, currency_available: currencies.length === 1,
    } : { ...row, currency: native || (nativeAvailable ? "USD" : null), currency_available: nativeAvailable });
  });
};

export const accounts = {
  list: async () => {
    const user = await currentAuthUser();
    return response(await ownedAccounts(user.id));
  },
  create: async (values) => {
    const user = await currentAuthUser();
    const { data, error } = await supabase.from("accounts").insert({ ...accountFinancialPayload(values), user_id: user.id }).select().single();
    check(error, "Impossible de créer le compte");
    notifyAppDataChanged(["accounts", "trades", "dashboard", "discipline"]);
    return response(enrichAccount(data));
  },
  update: async (id, values) => {
    const user = await currentAuthUser();
    const previous = (await ownedAccounts(user.id)).find(item => item.id === id);
    if (!previous) throw fail("Compte introuvable.", 404);
    const { data, error } = await supabase.from("accounts").update(accountFinancialPayload(values, previous)).eq("id", id).eq("user_id", user.id).select().single();
    check(error, "Impossible de modifier le compte");
    notifyAppDataChanged(["accounts", "dashboard", "discipline"]);
    return response(enrichAccount(data));
  },
  delete: async (id) => {
    await api.delete(`/integrations/core-accounts/${id}`);
    notifyAppDataChanged(["accounts", "trades", "dashboard", "discipline", "analytics", "dna"]);
    return response({ ok: true });
  },
};

const tradeNumbers = ["entry", "stop", "take_profit", "exit_price", "pnl", "r", "size", "duration_minutes", "point_value", "commission"];
const cleanTrade = (values) => {
  const allowed = ["account_id", "date", "instrument", "direction", "entry", "stop", "take_profit", "exit_price", "pnl", "result_status", "market_type", "setup", "setups", "session", "emotion", "emotion_secondary", "emotion_intensity", "notes", "plan_respected", "screenshots", "r", "size", "duration", "duration_minutes", "entry_time", "exit_time", "point_value", "commission", "mistakes", "exit_reason", "plan_exception_reason", "tags", "checklist_results", "starred", "import_batch_id", "import_source", "import_fingerprint", "external_trade_id", "provider_currency"];
  const payload = Object.fromEntries(Object.entries(values).filter(([key]) => allowed.includes(key)));
  tradeNumbers.forEach((key) => { if (key in payload) payload[key] = finiteInput(payload[key], key); });
  ["size", "commission"].forEach(key => { if (payload[key] === null) delete payload[key]; });
  ["entry_time", "exit_time"].forEach((key) => { if (key in payload) payload[key] = clockInput(payload[key]); });
  if (["open", "cancelled", "canceled"].includes(payload.result_status)) {
    payload.pnl = null;
    if (payload.result_status !== "open") payload.exit_price = null;
  }
  return payload;
};
const normalizeTrade = (value, account) => {
  const trade = numeric(value, tradeNumbers);
  const explicit = trade.provider_currency || trade.currency;
  const provider = trade.source_provider || trade.integration_account_id || trade.integration_connection_id;
  const native = explicit || account?.currency || (!provider ? "USD" : null);
  const currencyAvailable = trade.currency_available !== false && Boolean(explicit || (account?.currency_available !== false && native));
  const normalized = { ...trade, provider_currency: native, currency_available: currencyAvailable };
  return { ...normalized, pnl: measuredTradePnl(normalized) };
};

const manualTradeMatches = (stored, payload) => {
  const normalized = numeric(stored, tradeNumbers);
  return Object.entries(payload).every(([key, value]) => JSON.stringify(normalized[key]) === JSON.stringify(value));
};

export const trades = {
  list: async (accountId) => {
    const user = await currentAuthUser();
    try {
      const [data, accountRows] = await Promise.all([fetchOwnedTradeHistory(supabase, user.id, accountId), ownedAccounts(user.id)]);
      return response(data.map(row => normalizeTrade(row, accountRows.find(account => account.id === row.account_id))));
    } catch (error) {
      check(error, "Impossible de charger les trades");
    }
  },
  create: async (values, { requestId } = {}) => {
    const user = await currentAuthUser();
    const account = (await ownedAccounts(user.id)).find(item => item.id === values.account_id);
    if (!account) throw fail("Compte introuvable.", 404);
    const payload = validateTradeCurrency(cleanTrade(values), account);
    if (requestId && !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)) throw fail("Identifiant de sauvegarde invalide.", 422);
    let data, insertError;
    try {
      const result = await supabase.from("trades").insert({ ...payload, user_id: user.id, ...(requestId ? { id: requestId } : {}) }).select().single();
      data = result.data; insertError = result.error;
    } catch (error) { insertError = error; }
    if (insertError && requestId) {
      // The primary-key ID is retained by the form across retries. A response
      // timeout (or duplicate key) can mean the first insert already committed.
      const existing = await supabase.from("trades").select("*").eq("id", requestId).eq("user_id", user.id).maybeSingle();
      check(existing.error, "La sauvegarde n’est pas confirmée. Recharge le journal avant de réessayer.");
      if (existing.data?.id === requestId && existing.data.user_id === user.id) {
        if (!manualTradeMatches(existing.data, payload)) {
          const error = fail("Ce trade a déjà été enregistré avec les données de la première tentative. Recharge le journal et modifie le trade existant.", 409);
          error.saved_trade_id = requestId;
          throw error;
        }
        data = existing.data; insertError = null;
      }
    }
    check(insertError, "Impossible d’ajouter le trade");
    if (!data?.id || (requestId && data.id !== requestId) || (data.user_id !== undefined && data.user_id !== user.id)) throw fail("La réponse de sauvegarde est incohérente. Recharge le journal avant de réessayer.", 503);
    notifyAppDataChanged(["trades", "dashboard", "discipline", "analytics", "dna"]);
    return response(normalizeTrade(data));
  },
  update: async (id, values) => {
    const user = await currentAuthUser();
    const { data: previous, error: previousError } = await supabase.from("trades").select("*").eq("id", id).eq("user_id", user.id).single();
    check(previousError, "Trade introuvable");
    const account = (await ownedAccounts(user.id)).find(item => item.id === (values.account_id || previous.account_id));
    if (!account) throw fail("Compte introuvable.", 404);
    let payload = cleanTrade(values);
    if (previous.source_provider || previous.integration_account_id) {
      const financialFields = ["account_id", "date", "instrument", "direction", "entry", "exit_price", "pnl", "result_status", "size", "commission", "provider_currency", "stop", "take_profit", "r", "point_value", "entry_time", "exit_time", "duration", "duration_minutes", "market_type"];
      const expected = { ...previous, pnl: measuredTradePnl(previous), provider_currency: previous.provider_currency || account.currency };
      if (financialFields.some(key => key in payload && String(payload[key] ?? "") !== String(expected[key] ?? ""))) throw fail("Les résultats importés du fournisseur sont en lecture seule. Tu peux modifier tes notes et ta discipline ; un trade manuel doit rester distinct.");
      const annotationFields = ["setup", "setups", "session", "emotion", "emotion_secondary", "emotion_intensity", "notes", "plan_respected", "screenshots", "mistakes", "exit_reason", "plan_exception_reason", "tags", "checklist_results", "starred"];
      payload = Object.fromEntries(Object.entries(payload).filter(([key]) => annotationFields.includes(key)));
    } else payload = validateTradeCurrency(payload, account);
    const { data, error } = await supabase.from("trades").update(payload).eq("id", id).eq("user_id", user.id).select().single();
    check(error, "Impossible de modifier le trade");
    notifyAppDataChanged(["trades", "dashboard", "discipline", "analytics", "dna"]);
    return response(normalizeTrade(data));
  },
  delete: async (id) => {
    const user = await currentAuthUser();
    const { error } = await supabase.from("trades").delete().eq("id", id).eq("user_id", user.id);
    check(error, "Impossible de supprimer le trade");
    notifyAppDataChanged(["trades", "dashboard", "discipline", "analytics", "dna"]);
    return response({ ok: true });
  },
  importCsv: async ({ fileName, rows, totalRows, skippedRows = 0, errorRows = 0 }) => {
    const user = await currentAuthUser();
    if (!Array.isArray(rows) || !rows.length || rows.length > 50000) throw fail("Importe entre 1 et 50 000 lignes par fichier.");
    const [accountRows, existingRows] = await Promise.all([ownedAccounts(user.id), fetchOwnedTradeHistory(supabase, user.id)]);
    const known = new Set(existingRows.flatMap(tradeIdentityKeys));
    let duplicateRows = 0;
    const pending = [];
    // Validate every row before creating a batch or inserting any trade.
    for (const values of rows) {
      const account = accountRows.find(item => item.id === values.account_id);
      if (!account) throw fail("Compte d’import introuvable.", 404);
      const payload = validateTradeCurrency(cleanTrade(values), account);
      if (isDuplicateTradeImport(values, known)) { duplicateRows += 1; continue; }
      payload.import_fingerprint = tradeFingerprint(values);
      pending.push(payload);
      tradeIdentityKeys({ ...values, import_fingerprint: payload.import_fingerprint }).forEach(key => known.add(key));
    }
    const { data: batch, error: batchError } = await supabase.from("trade_imports").insert({
      user_id: user.id,
      file_name: fileName,
      total_rows: totalRows,
      skipped_rows: skippedRows + duplicateRows,
      error_rows: errorRows,
    }).select().single();
    check(batchError, "Impossible de démarrer l’import");
    const imported = [];
    try {
      for (let index = 0; index < pending.length; index += 200) {
        const payload = pending.slice(index, index + 200).map(values => ({
          ...values,
          user_id: user.id,
          import_batch_id: batch.id,
          import_source: "csv",
        }));
        const { data, error } = await supabase.from("trades").insert(payload).select();
        if (error?.code === "23505") {
          // Another tab may have inserted the same fingerprint after our read.
          // A failed bulk insert is atomic; retry rows and verify each conflict.
          for (const row of payload) {
            const result = await supabase.from("trades").insert(row).select().single();
            if (result.error?.code === "23505") {
              const conflict = await supabase.from("trades").select("id").eq("user_id", user.id).eq("import_fingerprint", row.import_fingerprint).maybeSingle();
              check(conflict.error, "Impossible de vérifier le doublon");
              if (!conflict.data) check(result.error, "Conflit d’import non identifié");
              duplicateRows += 1;
            } else {
              check(result.error, `Échec de l’import à partir de la ligne ${index + 1}`);
              imported.push(normalizeTrade(result.data));
            }
          }
        } else {
          check(error, `Échec de l’import à partir de la ligne ${index + 1}`);
          imported.push(...(data || []).map(normalizeTrade));
        }
      }
      const { error: completeError } = await supabase.from("trade_imports").update({
        status: "completed",
        imported_rows: imported.length,
        skipped_rows: skippedRows + duplicateRows,
        completed_at: new Date().toISOString(),
      }).eq("id", batch.id).eq("user_id", user.id);
      notifyAppDataChanged(["trades", "dashboard", "discipline", "analytics", "dna"]);
      return response({ batch: { ...batch, status: completeError ? "processing" : "completed", imported_rows: imported.length, skipped_rows: skippedRows + duplicateRows }, trades: imported, report_pending: Boolean(completeError) });
    } catch (error) {
      // Never destroy successful rows because a later write/report timed out.
      try { await supabase.from("trade_imports").update({ status: "failed", imported_rows: imported.length, skipped_rows: skippedRows + duplicateRows, completed_at: new Date().toISOString() }).eq("id", batch.id).eq("user_id", user.id); } catch { /* Retry uses persisted fingerprints. */ }
      notifyAppDataChanged(["trades", "dashboard", "discipline", "analytics", "dna"]);
      if (imported.length) {
        throw fail(`${imported.length} trade(s) ont été conservés avant l’interruption. Recharge le journal puis réimporte le fichier : les doublons seront ignorés.`, 503, error);
      }
      throw error;
    }
  },
  rollbackImport: async (batchId) => {
    const user = await currentAuthUser();
    const { error: deleteError } = await supabase.from("trades").delete().eq("import_batch_id", batchId).eq("user_id", user.id);
    check(deleteError, "Impossible d’annuler cet import");
    const { error: batchError } = await supabase.from("trade_imports").update({ status: "rolled_back", completed_at: new Date().toISOString() }).eq("id", batchId).eq("user_id", user.id);
    check(batchError, "Les trades sont supprimés, mais le rapport n’a pas pu être mis à jour");
    notifyAppDataChanged(["trades", "dashboard", "discipline", "analytics", "dna"]);
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
    const amount = finiteInput(values.amount, "Montant", { nullable: false, minimum: 0.01 });
    const account = (await ownedAccounts(user.id)).find(item => item.id === values.account_id);
    if (!account) throw fail("Compte introuvable.", 404);
    if (account.currency_available === false) throw fail("La devise native du compte est inconnue. Le payout ne peut pas être enregistré sous une devise supposée.");
    const payload = { account_id: values.account_id, amount, date: values.date, note: values.note || null, user_id: user.id };
    const { data, error } = await supabase.from("payouts").insert(payload).select().single();
    check(error, "Impossible d’enregistrer le payout");
    notifyAppDataChanged(["payouts", "dashboard"]);
    return response(normalizePayout(data));
  },
  delete: async (id) => {
    const user = await currentAuthUser();
    const { error } = await supabase.from("payouts").delete().eq("id", id).eq("user_id", user.id);
    check(error, "Impossible de supprimer le payout");
    notifyAppDataChanged(["payouts", "dashboard"]);
    return response({ ok: true });
  },
};

const fetchAllOwnedRows = async (table, userId, orderColumn = "created_at") => {
  const pageSize = 1000;
  const rows = [];
  const seen = new Set();
  let from = 0;
  for (let page = 0; page < 200; page += 1) {
    const { data, error } = await supabase.from(table).select("*").eq("user_id", userId)
      .order(orderColumn, { ascending: false }).order("id", { ascending: true }).range(from, from + pageSize - 1);
    check(error, `Impossible d’exporter les données de ${table}`);
    if (!data?.length) return rows;
    if (data.some(row => seen.has(row.id))) throw fail("Les données ont changé pendant leur lecture. Réessaie.", 503);
    data.forEach(row => seen.add(row.id));
    rows.push(...data);
    from += data.length;
  }
  throw fail("L’historique dépasse la limite de lecture sécurisée.", 413);
};

export const dataExports = {
  all: async () => {
    const user = await currentAuthUser();
    const [profile, accountRows, tradeRows, payoutRows, aiReports, backtest] = await Promise.all([
      loadCurrentUser({ retries: 2 }),
      ownedAccounts(user.id),
      fetchAllOwnedRows("trades", user.id, "date"),
      fetchAllOwnedRows("payouts", user.id, "date"),
      fetchAllOwnedRows("ai_reports", user.id),
      api.get("/account/backtest-export"),
    ]);
    return response({
      profile,
      accounts: accountRows.map(enrichAccount),
      trades: tradeRows.map(row => normalizeTrade(row, accountRows.find(account => account.id === row.account_id))),
      payouts: payoutRows.map(row => ({ ...normalizePayout(row), currency: accountRows.find(account => account.id === row.account_id)?.currency || null })),
      aiReports,
      backtest: backtest.data,
    });
  },
};

// Shell and Atlas use the same canonical financial report as the backend API.
// Monetary fields are null for mixed currencies instead of being added together.
export const dashboard = () => api.get("/dashboard");
export const dna = () => api.get("/dna");
export const onboarding = (values) => auth.update({ ...values, onboarded: true, onboarding_completed: true });

export const coach = {
  ask: (question, tag, options = {}) => api.post("/coach/ask", { question, context_tag: tag || "overall", ...options }),
  readiness: (payload) => api.post("/coach/readiness", payload),
  briefing: (period = "weekly", localDate) => api.get("/coach/briefing", { params: { period, ...(localDate ? { local_date: localDate } : {}) } }),
  history: async () => {
    const user = await currentAuthUser();
    const { data, error } = await supabase.from("ai_reports").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);
    check(error, "Impossible de charger les analyses");
    return response(data || []);
  },
};
export const billing = { checkout: (plan = "pro") => api.post("/billing/checkout", null, { params: { plan } }) };
export const economicCalendar = {
  list: (force = false) => api.get("/economic-calendar", { params: force ? { force: true } : undefined }),
};

export const newsletter = {
  subscribe: (email, locale = "fr", source = "website-footer") =>
    api.post("/newsletter/subscribe", { email, locale, source }),
  confirm: (token) => api.post("/newsletter/confirm", { token }),
  unsubscribe: (token) => api.post("/newsletter/unsubscribe", { token }),
  getPreferences: () => api.get("/email-preferences"),
  updatePreferences: (preferences) => api.put("/email-preferences", preferences),
};

const integrationMutation = async (request) => {
  const result = await request;
  notifyAppDataChanged(["accounts", "trades", "dashboard", "discipline", "analytics", "dna"]);
  return result;
};

export const integrationConnections = {
  capabilities: () => api.get("/integrations/capabilities"),
  list: () => api.get("/integrations/connections"),
  startOAuth: (provider, returnPath = "/app/settings") =>
    api.post("/integrations/oauth/start", { provider, return_path: returnPath }),
  completeOAuth: (provider, code, state) =>
    integrationMutation(api.post("/integrations/oauth/complete", { provider, code, state })),
  connectTradeLocker: (credentials) =>
    integrationMutation(api.post("/integrations/tradelocker/connect", credentials)),
  startMetaApi: (payload) => integrationMutation(api.post("/integrations/metaapi/start", payload)),
  searchMetaTraderServers: (platform, query) =>
    api.get("/integrations/metaapi/servers", { params: { platform, query } }),
  finalizeMetaApi: (connectionId) =>
    integrationMutation(api.post(`/integrations/metaapi/${connectionId}/finalize`)),
  selectAccounts: (connectionId, accountIds) =>
    integrationMutation(api.post(`/integrations/${connectionId}/accounts/select`, { account_ids: accountIds })),
  syncAccount: (accountId) => integrationMutation(api.post(`/integrations/accounts/${accountId}/sync`)),
  testMT5: (credentials) => api.post("/integrations/mt5/test", credentials),
  connectMT5: (credentials) => integrationMutation(api.post("/integrations/mt5/connect", credentials)),
  sync: (connectionId) => integrationMutation(api.post(`/integrations/${connectionId}/sync`)),
  reconnect: (connectionId, credentials) => integrationMutation(api.post(`/integrations/${connectionId}/reconnect`, credentials)),
  disconnect: (connectionId) => integrationMutation(api.delete(`/integrations/${connectionId}`)),
  joinWaitlist: async () => {
    const user = await currentAuthUser();
    const { data, error } = await supabase
      .from("integration_waitlist")
      .upsert({ user_id: user.id, platform: "mt5" }, { onConflict: "user_id,platform" })
      .select()
      .single();
    check(error, "Impossible de rejoindre la liste d’attente");
    return response(data);
  },
};
export const contact = async (values) => {
  return api.post("/support", values);
};

export const tradeScreenshots = {
  upload: async (tradeId, file) => {
    const user = await currentAuthUser();
    if (!TRADE_SCREENSHOT_TYPES.has(file?.type)) throw fail("Formats acceptés : JPEG, PNG ou WebP.", 400);
    if (file.size > MAX_TRADE_SCREENSHOT_BYTES) throw fail("Chaque capture doit faire 10 Mo maximum.", 400);
    const extension = ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" })[file.type];
    const path = `${user.id}/${tradeId}/${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage.from("trade-screenshots").upload(path, file, { upsert: false, contentType: file.type });
    check(error, "Impossible d’envoyer la capture");
    return path;
  },
  signedUrl: async (path, expiresIn = 3600) => {
    const { data, error } = await supabase.storage.from("trade-screenshots").createSignedUrl(path, expiresIn);
    check(error, "Impossible de lire la capture");
    return data.signedUrl;
  },
  delete: async (paths) => {
    const storedPaths = (paths || []).filter((path) => path && !/^https?:\/\//i.test(path));
    if (!storedPaths.length) return response({ ok: true });
    const { error } = await supabase.storage.from("trade-screenshots").remove(storedPaths);
    check(error, "Impossible de supprimer la capture");
    return response({ ok: true });
  },
};
