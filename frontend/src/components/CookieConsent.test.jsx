import React, { act } from "react";
import { createRoot } from "react-dom/client";
import CookieConsent, { openCookieSettings } from "./CookieConsent";
import { COOKIE_CONSENT_KEY, readCookieConsent, saveCookieConsent } from "../lib/cookieConsent";

jest.mock("react-router-dom", () => ({
  Link: ({ children, ...props }) => <a {...props}>{children}</a>,
  useLocation: () => ({ pathname: "/", search: "", hash: "" }),
}));
jest.mock("@/context/I18nContext", () => ({
  useI18n: () => ({ t: (fr) => fr }),
}), { virtual: true });
jest.mock("@/lib/authUrlPrivacy", () => require("../lib/authUrlPrivacy"), { virtual: true });
jest.mock("@/lib/cookieConsent", () => require("../lib/cookieConsent"), { virtual: true });

describe("CookieConsent", () => {
  let container;
  let root;

  beforeEach(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    localStorage.clear();
    delete window.posthog;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    document.querySelectorAll("#pipsevo-posthog").forEach((node) => node.remove());
  });

  const renderBanner = async () => {
    await act(async () => {
      root.render(<CookieConsent />);
    });
  };

  const button = (label) => Array.from(container.querySelectorAll("button"))
    .find((node) => node.textContent.includes(label));

  test("offers an equal accept and continue-without-analytics choice", async () => {
    await renderBanner();

    expect(container.getAttribute("hidden")).toBeNull();
    expect(button("Tout accepter")).toBeTruthy();
    expect(button("Continuer sans statistiques")).toBeTruthy();

    act(() => button("Continuer sans statistiques").click());
    expect(readCookieConsent()?.analytics).toBe(false);
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  test("custom settings persist the optional analytics choice", async () => {
    await renderBanner();
    act(() => button("Personnaliser").click());

    const checkbox = container.querySelector('input[type="checkbox"]');
    expect(checkbox.checked).toBe(false);
    act(() => checkbox.click());
    expect(checkbox.checked).toBe(true);
    act(() => button("Enregistrer mon choix").click());

    expect(JSON.parse(localStorage.getItem(COOKIE_CONSENT_KEY)).analytics).toBe(true);
  });

  test("the footer event reopens settings and allows consent withdrawal", async () => {
    saveCookieConsent(true);
    await renderBanner();
    expect(container.querySelector('[role="dialog"]')).toBeNull();

    act(() => openCookieSettings());
    expect(container.querySelector('input[type="checkbox"]').checked).toBe(true);
    act(() => button("Tout refuser").click());

    expect(readCookieConsent()?.analytics).toBe(false);
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });
});
