const fs = require("node:fs");
const path = require("node:path");
const loader = fs.readFileSync(path.resolve(__dirname, "../../public/posthog-loader.js"), "utf8");
const run = () => new Function(loader)();
beforeEach(() => { window.history.replaceState({}, "", "/"); delete window.posthog; window.__pipsevoAnalyticsConsentCheck = () => true; });
afterEach(() => { document.querySelectorAll('#pipsevo-posthog, script[src*="posthog"]').forEach(node => node.remove()); delete window.posthog; delete window.__pipsevoAnalyticsConsentCheck; });
const grant = () => { const script = document.createElement("script"); script.id = "pipsevo-posthog"; script.dataset.analyticsConsent = "granted"; document.head.appendChild(script); return script; };

test("a downloaded loader cannot start after its consent element was removed", () => {
  grant().remove(); run(); expect(window.posthog).toBeUndefined();
  expect(document.querySelector('script[src*="posthog"]')).toBeNull();
});
test.each(["/login", "/app/settings?code=fixture-code", "/auth/callback#access_token=fixture-token"])("the loader is inert on a sensitive URL %s", url => {
  window.history.replaceState({}, "", url); grant(); run(); expect(window.posthog).toBeUndefined();
});
test("the SDK starts opted out until the validated load callback grants capture", () => {
  grant(); run(); expect(window.posthog._i[0][1]).toMatchObject({ opt_out_capturing_by_default: true, capture_pageview: false, capture_pageleave: false, capture_dead_clicks: false, capture_exceptions: false, capture_performance: false, rageclick: false, disable_surveys: true, autocapture: false, disable_session_recording: true });
});

test("every event rechecks consent and sanitizes automatically attached URL properties", () => {
  grant(); run(); const filter = window.posthog._i[0][1].before_send;
  const event = { event: "$pageview", properties: { $current_url: "https://pipsevo.vercel.app/app/journal/trade-id?account=account-id", $initial_current_url: "https://pipsevo.vercel.app/app/settings?code=private-code", $referrer: "https://pipsevo.vercel.app/auth/callback?code=private-code", $pathname: "/app/journal/trade-id", $initial_pathname: "/admin/users/user-id", source: "settings" } };
  expect(filter(event).properties).toEqual({ $current_url: "https://pipsevo.vercel.app/app/journal", $initial_current_url: "https://pipsevo.vercel.app/app/settings", $referrer: "https://pipsevo.vercel.app/auth/callback", $pathname: "/app/journal", $initial_pathname: "/admin/users", source: "settings" });
  window.__pipsevoAnalyticsConsentCheck = () => false;
  expect(filter(event)).toBeNull();
});
