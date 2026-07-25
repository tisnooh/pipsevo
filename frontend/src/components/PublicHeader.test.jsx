import React, { act } from "react";
import { createRoot } from "react-dom/client";
import PublicHeader from "./PublicHeader";

const mockUseAuth = jest.fn();

jest.mock("react-router-dom", () => {
  const ReactRuntime = require("react");
  return {
    Link: ReactRuntime.forwardRef(({ to, children, ...props }, ref) => ReactRuntime.createElement("a", { ...props, href: to, ref }, children)),
  };
}, { virtual: true });

jest.mock("@/context/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}), { virtual: true });

jest.mock("@/context/I18nContext", () => ({
  useI18n: () => ({
    language: "fr",
    t: (french) => french,
  }),
}), { virtual: true });

jest.mock("@/components/LanguageSwitcher", () => ({
  __esModule: true,
  default: () => <button type="button">Langue</button>,
}), { virtual: true });

jest.mock("@/components/Logo", () => ({
  Logo: () => <a href="/">PipsEvo</a>,
  LogoMark: () => <span aria-hidden="true">P²</span>,
}), { virtual: true });

describe("PublicHeader", () => {
  let container;
  let root;

  beforeEach(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    document.body.style.overflow = "";
    jest.clearAllMocks();
  });

  function renderHeader() {
    act(() => {
      root.render(<PublicHeader />);
    });
  }

  test("affiche Connexion et les CTA marketing pour un visiteur", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    renderHeader();

    const accountAction = container.querySelector('[data-testid="public-auth-action"]');
    expect(accountAction?.textContent).toBe("Connexion");
    expect(accountAction?.getAttribute("href")).toBe("/login");
    expect(container.querySelectorAll('a[href="/register"]')).toHaveLength(1);
    expect(container.querySelector('a[href="/app/dashboard"]')).toBeNull();

    act(() => {
      container.querySelector('[data-testid="public-mobile-menu-button"]').dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(container.querySelectorAll('a[href="/register"]')).toHaveLength(2);
    expect(document.body.style.overflow).toBe("hidden");

    act(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    expect(container.querySelector("#public-mobile-menu")).toBeNull();
    expect(document.body.style.overflow).toBe("");
  });

  test("remplace Connexion par Tableau de bord pour un utilisateur connecte", () => {
    mockUseAuth.mockReturnValue({ user: { id: "user-1" }, loading: false });
    renderHeader();

    const accountAction = container.querySelector('[data-testid="public-auth-action"]');
    expect(accountAction?.textContent).toBe("Tableau de bord");
    expect(accountAction?.getAttribute("href")).toBe("/app/dashboard");
    expect(container.querySelector('a[href="/login"]')).toBeNull();
    expect(container.querySelector('a[href="/register"]')).toBeNull();
  });

  test("n'affiche aucune action d'authentification pendant le chargement", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true });
    renderHeader();

    expect(container.querySelector('[data-testid="public-auth-action"]')).toBeNull();
    expect(container.querySelector('a[href="/login"]')).toBeNull();
    expect(container.querySelector('a[href="/register"]')).toBeNull();
  });
});
