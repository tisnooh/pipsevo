import React, { act } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

const mockRefresh = jest.fn();
const mockLogout = jest.fn();
const mockAdminSession = jest.fn();
let mockUser;
jest.mock("@/context/AuthContext", () => ({
  AuthProvider: ({ children }) => children,
  useAuth: () => ({ user: mockUser, loading: false, refreshProfile: mockRefresh, logout: mockLogout }),
}));
jest.mock("@/features/admin/api", () => ({ adminApi: { session: mockAdminSession } }));
jest.mock("@/context/I18nContext", () => ({ I18nProvider: ({ children }) => children }));
jest.mock("@/features/admin/ProductOperations", () => ({ ProductTelemetry: () => null }));
jest.mock("@/components/CookieConsent", () => () => null);
jest.mock("@/components/RouteSEO", () => () => null);
jest.mock("@/components/RouteScrollManager", () => () => null);
jest.mock("@/components/ThemeToggle", () => () => null);
jest.mock("@/components/ui/sonner", () => ({ Toaster: () => null }));
jest.mock("@/index.css", () => ({}));

let root, container;
beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true; jest.clearAllMocks();
  mockUser = { id: "fixture", profile_loading_error: true };
  mockRefresh.mockResolvedValue(undefined); mockLogout.mockResolvedValue(undefined);
  container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });

test.each(["/app/dashboard", "/app/settings", "/onboarding", "/login", "/register", "/admin"])("%s refuses to edit an unloaded existing profile", async path => {
  window.history.replaceState({}, "", path);
  await act(async () => root.render(<App/>));
  expect(container.textContent).toContain("Ton profil n’a pas pu être chargé");
  expect(window.location.pathname).toBe(path);
  await act(async () => [...container.querySelectorAll("button")].find(button => button.textContent === "Réessayer").click());
  expect(mockRefresh).toHaveBeenCalledTimes(1);
  expect(mockLogout).not.toHaveBeenCalled();
});

test.each(["/app/dashboard", "/app/settings", "/app/backtest", "/onboarding", "/login", "/register", "/admin"])("%s blocks a suspended profile without loading private features", async path => {
  mockUser = { id: "fixture", status: "suspended", onboarding_completed: true };
  window.history.replaceState({}, "", path);
  await act(async () => root.render(<App/>));
  expect(container.textContent).toContain("Ton accès est suspendu");
  expect(window.location.pathname).toBe(path);
  expect(mockAdminSession).not.toHaveBeenCalled();
});
