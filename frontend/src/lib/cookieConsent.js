import { canLoadAnalytics } from "./authUrlPrivacy";

export const COOKIE_CONSENT_KEY = "pipsevo_cookie_consent";
export const LEGACY_ANALYTICS_CONSENT_KEY = "pipsevo_analytics_consent";
export const COOKIE_CONSENT_VERSION = 1;
export const COOKIE_CONSENT_DURATION_MS = 180 * 24 * 60 * 60 * 1000;

const browserStorage = () => typeof window === "undefined" ? null : window.localStorage;

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
  const storage = browserStorage();
  if (!storage) return null;
  try {
    const consent = normalizeConsent(JSON.parse(storage.getItem(COOKIE_CONSENT_KEY)), now);
    if (consent) return consent;
    storage.removeItem(COOKIE_CONSENT_KEY);
  } catch {
    storage.removeItem(COOKIE_CONSENT_KEY);
  }

  const legacy = storage.getItem(LEGACY_ANALYTICS_CONSENT_KEY);
  if (!legacy) return null;
  const consent = createCookieConsent(legacy === "accepted", now);
  storage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consent));
  storage.removeItem(LEGACY_ANALYTICS_CONSENT_KEY);
  return consent;
}

export function saveCookieConsent(analytics, now = Date.now()) {
  const consent = createCookieConsent(analytics, now);
  const storage = browserStorage();
  if (storage) {
    storage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consent));
    storage.removeItem(LEGACY_ANALYTICS_CONSENT_KEY);
    window.dispatchEvent(new CustomEvent("pipsevo:cookie-consent-changed", { detail: consent }));
  }
  return consent;
}

export const hasAnalyticsConsent = () => readCookieConsent()?.analytics === true;

const isPosthogKey = (key) => /^(ph_|posthog)/i.test(key || "");

export function clearPosthogPersistence() {
  if (typeof window === "undefined") return;
  [window.localStorage, window.sessionStorage].forEach((storage) => {
    const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index)).filter(isPosthogKey);
    keys.forEach((key) => storage.removeItem(key));
  });
  document.cookie.split(";").forEach((entry) => {
    const name = entry.split("=")[0]?.trim();
    if (!isPosthogKey(name)) return;
    document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
  });
}

export function disableAnalytics({ clearPersistence = true } = {}) {
  if (typeof window === "undefined") return;
  window.posthog?.opt_out_capturing?.({ clear_persistence: clearPersistence });
  if (!clearPersistence) return;
  document.querySelectorAll('script[id="pipsevo-posthog"], script[src*="posthog.com"], script[src*="posthog-assets"]').forEach((script) => script.remove());
  clearPosthogPersistence();
  try { delete window.posthog; } catch { window.posthog = undefined; }
}

export function loadAnalytics(location = window.location) {
  if (typeof window === "undefined" || !hasAnalyticsConsent() || !canLoadAnalytics(location)) return Promise.resolve(false);
  if (window.posthog?.__SV) {
    window.posthog.opt_in_capturing?.();
    return Promise.resolve(true);
  }

  const existing = document.getElementById("pipsevo-posthog");
  if (existing) {
    return new Promise((resolve) => {
      existing.addEventListener("load", () => { window.posthog?.opt_in_capturing?.(); resolve(Boolean(window.posthog)); }, { once: true });
      existing.addEventListener("error", () => resolve(false), { once: true });
    });
  }

  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.id = "pipsevo-posthog";
    script.src = "/posthog-loader.js";
    script.async = true;
    script.addEventListener("load", () => { window.posthog?.opt_in_capturing?.(); resolve(Boolean(window.posthog)); }, { once: true });
    script.addEventListener("error", () => { script.remove(); resolve(false); }, { once: true });
    document.head.appendChild(script);
  });
}

export function captureAnalyticsPageview(location = window.location) {
  if (!hasAnalyticsConsent() || !canLoadAnalytics(location)) return false;
  const currentUrl = location?.href || (typeof window !== "undefined" ? window.location.href : "");
  window.posthog?.capture?.("$pageview", { $current_url: currentUrl });
  return Boolean(window.posthog?.capture);
}
