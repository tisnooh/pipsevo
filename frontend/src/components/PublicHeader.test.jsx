import React, { act } from "react";
import { createRoot } from "react-dom/client";
import PublicHeader from "./PublicHeader";

const mockUseAuth = jest.fn();
const mockNavigate = jest.fn();
const mockToastError = jest.fn();

jest.mock("react-router-dom", () => {
  const ReactRuntime = require("react");
  return {
    Link: ReactRuntime.forwardRef(({ to, children, ...props }, ref) => ReactRuntime.createElement("a", { ...props, href: to, ref }, children)),
    useNavigate: () => mockNavigate,
  };
}, { virtual: true });

jest.mock("sonner", () => ({
  toast: { error: (...args) => mockToastError(...args) },
}), { virtual: true });

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

  function renderHeader(props) {
    act(() => {
      root.render(<PublicHeader {...props} />);
    });
  }

  test("affiche Connexion et les CTA marketing pour un visiteur", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false, logout: jest.fn() });
    renderHeader();

    const accountAction = container.querySelector('[data-testid="public-auth-action"]');
    expect(accountAction?.textContent).toBe("Connexion");
    expect(accountAction?.getAttribute("href")).toBe("/login");
    expect(container.querySelectorAll('a[href="/register"]')).toHaveLength(1);
    expect(container.querySelector('[data-testid="public-profile-button"]')).toBeNull();

    act(() => {
      container.querySelector('[data-testid="public-mobile-menu-button"]').dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(container.querySelectorAll('a[href="/register"]')).toHaveLength(2);
    expect(document.body.style.overflow).toBe("hidden");

    act(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    expect(container.querySelector("#public-mobile-menu")).toBeNull();
    expect(document.body.style.overflow).toBe("");
  });

  test("affiche le profil, ses initiales et les routes réelles pour un utilisateur connecté", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "user-1", name: "Itiel Martin", email: "itiel@example.com" },
      loading: false,
      logout: jest.fn(),
    });
    renderHeader();

    expect(container.querySelector('a[href="/login"]')).toBeNull();
    expect(container.querySelector('a[href="/register"]')).toBeNull();
    const profileButton = container.querySelector('[data-testid="public-profile-button"]');
    expect(profileButton?.textContent).toContain("IM");
    expect(profileButton?.textContent).toContain("Itiel");

    act(() => profileButton.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(profileButton.getAttribute("aria-expanded")).toBe("true");
    expect(container.querySelector('a[href="/app/dashboard"]')?.textContent).toContain("Tableau de bord");
    expect(container.querySelector('a[href="/app/settings"]')?.textContent).toContain("Paramètres");
  });

  test("ferme le menu profil au clic extérieur et avec Échap", () => {
    mockUseAuth.mockReturnValue({ user: { id: "user-1", name: "Itiel" }, loading: false, logout: jest.fn() });
    renderHeader();
    const profileButton = container.querySelector('[data-testid="public-profile-button"]');

    act(() => profileButton.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(container.querySelector("#public-profile-menu")).not.toBeNull();
    act(() => document.body.dispatchEvent(new Event("pointerdown", { bubbles: true })));
    expect(container.querySelector("#public-profile-menu")).toBeNull();

    act(() => profileButton.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    act(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    expect(container.querySelector("#public-profile-menu")).toBeNull();
    expect(document.activeElement).toBe(profileButton);
  });

  test("déconnecte la session locale puis redirige vers l'accueil", async () => {
    const logout = jest.fn().mockResolvedValue(undefined);
    mockUseAuth.mockReturnValue({ user: { id: "user-1", name: "Itiel" }, loading: false, logout });
    renderHeader();

    act(() => container.querySelector('[data-testid="public-profile-button"]').dispatchEvent(new MouseEvent("click", { bubbles: true })));
    const signOutButton = Array.from(container.querySelectorAll('[role="menuitem"]')).find(item => item.textContent.includes("Déconnexion"));
    await act(async () => {
      signOutButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(logout).toHaveBeenCalledWith("local");
    expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
  });

  test("n'affiche jamais Connexion pendant le chargement de la session", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true, logout: jest.fn() });
    renderHeader();

    expect(container.querySelector('[data-testid="public-auth-loading"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="public-auth-action"]')).toBeNull();
    expect(container.querySelector('[data-testid="public-profile-button"]')).toBeNull();
    expect(container.querySelector('a[href="/login"]')).toBeNull();
    expect(container.querySelector('a[href="/register"]')).toBeNull();
  });
});
