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
});

export function readSettings() {
  if (typeof window === "undefined") return { ...DEFAULT_SETTINGS };
  try {
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function writeSettings(next) {
  const settings = { ...readSettings(), ...next };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  window.dispatchEvent(new CustomEvent(SETTINGS_EVENT, { detail: settings }));
  return settings;
}

export function applyDocumentPreferences(settings = readSettings()) {
  document.documentElement.lang = settings.language === "en" ? "en" : "fr";
  document.documentElement.dataset.density = settings.compactMode ? "compact" : "comfortable";
}

export function formatMoney(value, options = {}) {
  const settings = options.settings || readSettings();
  const locale = settings.language === "en" ? "en-US" : "fr-FR";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: settings.currency || "USD",
    minimumFractionDigits: options.minimumFractionDigits ?? 0,
    maximumFractionDigits: options.maximumFractionDigits ?? 2,
    signDisplay: options.signDisplay || "auto",
  }).format(Number(value || 0));
}

export function formatDate(value, options = {}) {
  if (!value) return "—";
  const settings = options.settings || readSettings();
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
