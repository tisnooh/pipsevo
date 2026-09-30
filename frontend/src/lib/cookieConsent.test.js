import {
  COOKIE_CONSENT_DURATION_MS,
  COOKIE_CONSENT_KEY,
  LEGACY_ANALYTICS_CONSENT_KEY,
  captureAnalyticsPageview,
  clearPosthogPersistence,
  createCookieConsent,
  disableAnalytics,
  loadAnalytics,
  readCookieConsent,
  saveCookieConsent,
} from "./cookieConsent";

const safeLocation = {
  pathname: "/features",
  search: "",
  hash: "",
  href: "https://pipsevo.vercel.app/features",
};

describe("cookie consent", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    document.querySelectorAll("#pipsevo-posthog").forEach((node) => node.remove());
    document.cookie.split(";").forEach((entry) => {
      const name = entry.split("=")[0]?.trim();
      if (name) document.cookie = `${name}=; Max-Age=0; path=/`;
    });
    delete window.posthog;
  });

  test("creates and persists an expiring structured choice", () => {
    const now = 1_000;
    const consent = saveCookieConsent(true, now);

    expect(consent).toEqual({
      version: 1,
      necessary: true,
      analytics: true,
      decidedAt: now,
      expiresAt: now + COOKIE_CONSENT_DURATION_MS,
    });
    expect(readCookieConsent(now + 1)).toEqual(consent);
    expect(readCookieConsent(consent.expiresAt)).toBeNull();
  });

  test.each([
    ["accepted", true],
    ["refused", false],
  ])("migrates the legacy %s choice", (legacy, expected) => {
    localStorage.setItem(LEGACY_ANALYTICS_CONSENT_KEY, legacy);

    expect(readCookieConsent(5_000)?.analytics).toBe(expected);
    expect(localStorage.getItem(LEGACY_ANALYTICS_CONSENT_KEY)).toBeNull();
    expect(localStorage.getItem(COOKIE_CONSENT_KEY)).not.toBeNull();
  });

  test("does not load analytics before consent or on a sensitive URL", async () => {
    expect(await loadAnalytics(safeLocation)).toBe(false);
    expect(document.getElementById("pipsevo-posthog")).toBeNull();

    saveCookieConsent(true);
    expect(await loadAnalytics({ ...safeLocation, pathname: "/login" })).toBe(false);
    expect(document.getElementById("pipsevo-posthog")).toBeNull();
  });

  test("loads analytics after consent and opts back in", async () => {
    saveCookieConsent(true);
    const loading = loadAnalytics(safeLocation);
    const script = document.getElementById("pipsevo-posthog");
    const optIn = jest.fn();
    window.posthog = { __SV: 1, opt_in_capturing: optIn };
    script.dispatchEvent(new Event("load"));

    await expect(loading).resolves.toBe(true);
    expect(optIn).toHaveBeenCalledTimes(1);
  });

  test("declining removes only PostHog persistence and scripts", () => {
    saveCookieConsent(false);
    localStorage.setItem("ph_example_posthog", "analytics");
    localStorage.setItem("pipsevo_settings", "required");
    sessionStorage.setItem("posthog_session", "analytics");
    document.cookie = "ph_cookie=value; path=/";
    const script = document.createElement("script");
    script.id = "pipsevo-posthog";
    document.head.appendChild(script);
    const optOut = jest.fn();
    window.posthog = { opt_out_capturing: optOut };

    disableAnalytics();

    expect(optOut).toHaveBeenCalledWith({ clear_persistence: true });
    expect(localStorage.getItem("ph_example_posthog")).toBeNull();
    expect(sessionStorage.getItem("posthog_session")).toBeNull();
    expect(localStorage.getItem("pipsevo_settings")).toBe("required");
    expect(localStorage.getItem(COOKIE_CONSENT_KEY)).not.toBeNull();
    expect(document.getElementById("pipsevo-posthog")).toBeNull();
    expect(window.posthog).toBeUndefined();
  });

  test("page views require consent and use the requested URL", () => {
    const capture = jest.fn();
    window.posthog = { capture };

    expect(captureAnalyticsPageview(safeLocation)).toBe(false);
    saveCookieConsent(true);
    expect(captureAnalyticsPageview(safeLocation)).toBe(true);
    expect(capture).toHaveBeenCalledWith("$pageview", { $current_url: safeLocation.href });
  });

  test("clearPosthogPersistence is safe with unrelated browser state", () => {
    localStorage.setItem("ph_test", "x");
    localStorage.setItem("unrelated", "y");
    clearPosthogPersistence();
    expect(localStorage.getItem("ph_test")).toBeNull();
    expect(localStorage.getItem("unrelated")).toBe("y");
  });

  test("createCookieConsent always keeps necessary storage enabled", () => {
    expect(createCookieConsent(false, 10).necessary).toBe(true);
  });
});
