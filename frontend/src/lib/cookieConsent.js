import { canLoadAnalytics } from "./authUrlPrivacy";

export const COOKIE_CONSENT_KEY = "pipsevo_cookie_consent";
export const LEGACY_ANALYTICS_CONSENT_KEY = "pipsevo_analytics_consent";
export const COOKIE_CONSENT_VERSION = 1;
export const COOKIE_CONSENT_DURATION_MS = 180 * 24 * 60 * 60 * 1000;

let sessionConsent = null;
const browserStorage = (kind = "localStorage") => {
  try { return typeof window === "undefined" ? null : window[kind]; }
  catch { return null; }
};

const normalizeConsent = (value, now = Date.now()) => {
  if (!value || typeof value !== "object" || value.version !== COOKIE_CONSENT_VERSION) return null;
  const decidedAt = Number(value.decidedAt);
  const expiresAt = Number(value.expiresAt);
  if (!Number.isFinite(decidedAt) || !Number.isFinite(expiresAt) || expiresAt <= now) return null;
  return { version: COOKIE_CONSENT_VERSION, necessary: true, analytics: value.analytics === true, decidedAt, expiresAt };
};

export function createCookieConsent(analytics, now = Date.now()) {
  return {
    version: COOKIE_CONSENT_VERSION,
    necessary: true,
    analytics: analytics === true,
    decidedAt: now,
    expiresAt: now + COOKIE_CONSENT_DURATION_MS,
  };
}

export function readCookieConsent(now = Date.now()) {
  const temporary = normalizeConsent(sessionConsent, now);
  if (temporary) return temporary;
  const storage = browserStorage();
  if (!storage) return null;
  try {
    const consent = normalizeConsent(JSON.parse(storage.getItem(COOKIE_CONSENT_KEY)), now);
    if (consent) return consent;
    storage.removeItem(COOKIE_CONSENT_KEY);
    const legacy = storage.getItem(LEGACY_ANALYTICS_CONSENT_KEY);
    if (!["accepted", "refused"].includes(legacy)) return null;
    const migrated = createCookieConsent(legacy === "accepted", now);
    storage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(migrated));
    storage.removeItem(LEGACY_ANALYTICS_CONSENT_KEY);
    return migrated;
  } catch { return null; }
}

export function saveCookieConsent(analytics, now = Date.now()) {
  const consent = createCookieConsent(analytics, now);
  const storage = browserStorage();
  sessionConsent = consent;
  try {
    if (storage) {
      storage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consent));
      storage.removeItem(LEGACY_ANALYTICS_CONSENT_KEY);
      sessionConsent = null;
    }
  } catch { /* The explicit choice remains valid for this page session. */ }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("pipsevo:cookie-consent-changed", { detail: consent }));
  }
  return consent;
}

export function isCookieConsentPersisted(consent) {
  try {
    const saved = JSON.parse(browserStorage()?.getItem(COOKIE_CONSENT_KEY) || "null");
    return saved?.version === consent.version && saved.analytics === consent.analytics && saved.decidedAt === consent.decidedAt && saved.expiresAt === consent.expiresAt;
  } catch { return false; }
}

export const hasAnalyticsConsent = () => readCookieConsent()?.analytics === true;

const isPosthogKey = (key) => /^(ph_|posthog)/i.test(key || "");

export function clearPosthogPersistence() {
  if (typeof window === "undefined") return;
  ["localStorage", "sessionStorage"].forEach((kind) => {
    try {
      const storage = browserStorage(kind);
      if (!storage) return;
      const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index)).filter(isPosthogKey);
      keys.forEach((key) => storage.removeItem(key));
    } catch { /* Privacy controls still work if optional persistence is blocked. */ }
  });
  try {
    document.cookie.split(";").forEach((entry) => {
      const name = entry.split("=")[0]?.trim();
      if (!isPosthogKey(name)) return;
      document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
    });
  } catch { /* Cookies may also be blocked by the browser. */ }
}

export function disableAnalytics({ clearPersistence = true } = {}) {
  if (typeof window === "undefined") return;
  window.__pipsevoAnalyticsConsentCheck = () => false;
  try { window.posthog?.opt_out_capturing?.({ clear_persistence: clearPersistence }); }
  catch { /* An optional SDK must not prevent withdrawal of consent. */ }
  if (!clearPersistence) return;
  document.querySelectorAll('script[id="pipsevo-posthog"], script[src*="posthog.com"], script[src*="posthog-assets"]').forEach((script) => script.remove());
  clearPosthogPersistence();
  // Retain the queued opt-out while a previously downloaded SDK finishes loading.
  // Deleting its queue could lose the withdrawal and restore capture.
}

const enableAnalyticsIfAllowed = location => {
  if (!hasAnalyticsConsent() || !canLoadAnalytics(location) || !canLoadAnalytics(window.location)) return false;
  try { window.posthog?.opt_in_capturing?.(); return Boolean(window.posthog); }
  catch { return false; }
};

export function loadAnalytics(location = window.location) {
  if (typeof window === "undefined" || !hasAnalyticsConsent() || !canLoadAnalytics(location)) return Promise.resolve(false);
  window.__pipsevoAnalyticsConsentCheck = () => hasAnalyticsConsent() && canLoadAnalytics(window.location);
  if (window.posthog?.__SV) {
    return Promise.resolve(enableAnalyticsIfAllowed(location));
  }

  const existing = document.getElementById("pipsevo-posthog");
  if (existing) {
    return new Promise((resolve) => {
      existing.addEventListener("load", () => resolve(enableAnalyticsIfAllowed(location)), { once: true });
      existing.addEventListener("error", () => resolve(false), { once: true });
    });
  }

  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.id = "pipsevo-posthog";
    script.dataset.analyticsConsent = "granted";
    script.src = "/posthog-loader.js";
    script.async = true;
    script.addEventListener("load", () => resolve(enableAnalyticsIfAllowed(location)), { once: true });
    script.addEventListener("error", () => { script.remove(); resolve(false); }, { once: true });
    document.head.appendChild(script);
  });
}

export function captureAnalyticsPageview(location = window.location) {
  if (!hasAnalyticsConsent() || !canLoadAnalytics(location)) return false;
  try {
    const url = new URL(location?.href || window.location.href);
    url.search = ""; url.hash = "";
    if (/^\/(app|admin)(\/|$)/.test(url.pathname)) url.pathname = `/${url.pathname.split("/").filter(Boolean).slice(0, 2).join("/")}`;
    window.posthog?.capture?.("$pageview", { $current_url: url.href });
    return Boolean(window.posthog?.capture);
  } catch { return false; }
}
