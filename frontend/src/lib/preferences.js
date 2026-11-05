export const SETTINGS_KEY = "pipsevo_settings";
export const SETTINGS_EVENT = "pipsevo:settings-updated";

export const DEFAULT_SETTINGS = Object.freeze({
  currency: "USD",
  timezone: "Europe/Paris",
  language: "fr",
  compactMode: false,
  daily: true,
  risk: true,
  payout: true,
  product: false,
  education: false,
});

let temporarySettings = null;
export function normalizeSettings(value) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const settings = { ...DEFAULT_SETTINGS };
  if (/^[A-Z]{3}$/.test(String(source.currency || ""))) settings.currency = source.currency;
  if (["fr", "en"].includes(source.language)) settings.language = source.language;
  if (typeof source.timezone === "string") {
    try { new Intl.DateTimeFormat("fr", { timeZone: source.timezone }); settings.timezone = source.timezone; } catch { /* Use the safe default for invalid stored timezones. */ }
  }
  ["compactMode", "daily", "risk", "payout", "product", "education"].forEach(key => {
    if (typeof source[key] === "boolean") settings[key] = source[key];
  });
  return settings;
}

export function readSettings() {
  if (temporarySettings) return { ...temporarySettings };
  if (typeof window === "undefined") return { ...DEFAULT_SETTINGS };
  try {
    return normalizeSettings(JSON.parse(localStorage.getItem(SETTINGS_KEY)));
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function writeSettings(next) {
  const settings = normalizeSettings({ ...readSettings(), ...next });
  let persisted = false;
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); temporarySettings = null; persisted = true; }
  catch { temporarySettings = settings; }
  Object.defineProperty(settings, "persisted", { value: persisted, enumerable: false });
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(SETTINGS_EVENT, { detail: settings }));
  return settings;
}

export function listenForSettingsChanges(callback) {
  if (typeof window === "undefined") return () => {};
  const onSettings = event => callback(normalizeSettings(event.detail || readSettings()));
  const onStorage = event => {
    if (event.key === SETTINGS_KEY) callback(readSettings());
  };
  window.addEventListener(SETTINGS_EVENT, onSettings);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(SETTINGS_EVENT, onSettings);
    window.removeEventListener("storage", onStorage);
  };
}

export function applyDocumentPreferences(settings = readSettings()) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = settings.language === "en" ? "en" : "fr";
  document.documentElement.dataset.density = settings.compactMode ? "compact" : "comfortable";
}

export function formatMoney(value, options = {}) {
  const settings = normalizeSettings(options.settings || readSettings());
  if (value === null || value === undefined || value === "" || !Number.isFinite(Number(value))) return "—";
  const locale = settings.language === "en" ? "en-US" : "fr-FR";
  const currency = String(options.currency || settings.currency || "USD");
  if (currency === "UNKNOWN") return "—";
  if (!/^[A-Z]{3}$/.test(currency)) return `${new Intl.NumberFormat(locale, {
    minimumFractionDigits: options.minimumFractionDigits ?? 0, maximumFractionDigits: options.maximumFractionDigits ?? 2,
    signDisplay: options.signDisplay || "auto",
  }).format(Number(value))} ${currency}`;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: options.minimumFractionDigits ?? 0,
    maximumFractionDigits: options.maximumFractionDigits ?? 2,
    signDisplay: options.signDisplay || "auto",
  }).format(Number(value || 0));
}

export function formatDate(value, options = {}) {
  if (!value) return "—";
  const settings = normalizeSettings(options.settings || readSettings());
  const locale = settings.language === "en" ? "en-US" : "fr-FR";
  // Une date métier sans heure (ex. 2026-07-13) ne doit pas reculer d'un jour
  // lorsque l'utilisateur choisit un fuseau américain.
  const normalized = typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00Z` : value;
  const date = normalized instanceof Date ? normalized : new Date(normalized);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat(locale, {
    timeZone: settings.timezone || "Europe/Paris",
    year: options.year ?? "numeric",
    month: options.month || "2-digit",
    day: options.day || "2-digit",
    hour: options.withTime ? "2-digit" : undefined,
    minute: options.withTime ? "2-digit" : undefined,
  }).format(date);
}
