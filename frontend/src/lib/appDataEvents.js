export const APP_DATA_CHANGED_EVENT = "pipsevo:app-data-changed";

const normalizeDomains = domains => Array.from(new Set(
  (Array.isArray(domains) ? domains : [domains]).filter(Boolean),
));

export function notifyAppDataChanged(domains = ["all"]) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(APP_DATA_CHANGED_EVENT, {
    detail: { domains: normalizeDomains(domains), changedAt: Date.now() },
  }));
}

export function dataChangeMatches(event, domains = ["all"]) {
  const expected = normalizeDomains(domains);
  const changed = normalizeDomains(event?.detail?.domains || ["all"]);
  return expected.includes("all") || changed.includes("all") || expected.some(domain => changed.includes(domain));
}

export function listenForAppDataChanges(callback, domains = ["all"]) {
  if (typeof window === "undefined") return () => {};
  const listener = event => {
    if (dataChangeMatches(event, domains)) callback(event);
  };
  window.addEventListener(APP_DATA_CHANGED_EVENT, listener);
  return () => window.removeEventListener(APP_DATA_CHANGED_EVENT, listener);
}
