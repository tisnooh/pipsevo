import React, { act } from "react";
import { createRoot } from "react-dom/client";
import AuthCallback from "./AuthCallback";

let mockAuth;
let mockLocation;
jest.mock("../context/AuthContext", () => ({ useAuth: () => mockAuth }));
jest.mock("../context/I18nContext", () => ({ useI18n: () => ({ t: text => text }) }));
jest.mock("../components/auth/AuthLayout", () => ({ __esModule: true, default: ({ children }) => <main>{children}</main> }));
jest.mock("../lib/supabase", () => ({ supabase: {}, supabaseUrl: "", publishableKey: "" }));
jest.mock("react-router-dom", () => ({
  useLocation: () => mockLocation,
  Navigate: ({ to, replace }) => <div data-destination={to} data-replace={replace} />,
  Link: ({ to, children }) => <a href={to}>{children}</a>,
}), { virtual: true });

let root;
let container;
beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  mockAuth = { user: null, loading: false };
  mockLocation = { search: "", hash: "" };
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); });
const render = () => act(() => root.render(<AuthCallback />));

test("waits for profile hydration instead of redirecting a loading session", () => {
  mockAuth = { user: null, loading: true };
  render();
  expect(container.querySelector('[role="status"]')).not.toBeNull();
  expect(container.querySelector('[data-destination]')).toBeNull();
  mockAuth = { user: { onboarding_completed: true }, loading: false };
  render();
  expect(container.querySelector('[data-destination]').dataset.destination).toBe("/app/dashboard");
  expect(container.querySelector('[data-destination]').dataset.replace).toBe("true");
});
test("a new Google user follows the existing onboarding flow", () => {
  mockAuth.user = { onboarding_completed: false };
  render();
  expect(container.querySelector('[data-destination]').dataset.destination).toBe("/onboarding");
});
test("a confirmed signup gets a branded success screen before onboarding", () => {
  mockAuth.user = { onboarding_completed: false };
  mockLocation.search = "?next=%2Fonboarding";
  render();
  expect(container.textContent).toContain("Adresse confirmée");
  expect(container.querySelector('[data-destination]')).toBeNull();
  expect(container.querySelector('a[href="/onboarding"]')).not.toBeNull();
});
test("a cancelled Google return is not mistaken for a successful existing session", () => {
  mockAuth.user = { onboarding_completed: true };
  mockLocation.hash = "#error=access_denied&error_description=private-text";
  render();
  expect(container.textContent).toContain("Connexion annulée");
  expect(container.textContent).not.toContain("private-text");
  expect(container.querySelector('[data-destination]')).toBeNull();
});
test("an expired email link offers safe recovery actions", () => {
  mockLocation.hash = "#error=access_denied&error_code=otp_expired&error_description=private-text";
  render();
  expect(container.textContent).toContain("Ce lien a expiré");
  expect(container.textContent).not.toContain("private-text");
  expect(container.querySelector('a[href="/verify-email"]')).not.toBeNull();
  expect(container.querySelector('a[href="/forgot-password"]')).not.toBeNull();
});
test("an already confirmed link directs the user to sign in", () => {
  mockLocation.hash = "#error=access_denied&error_description=Email+already+confirmed";
  render();
  expect(container.textContent).toContain("Adresse déjà confirmée");
  expect(container.querySelector('a[href="/login"]')).not.toBeNull();
});
test("an empty callback provides a working return to login", () => {
  render();
  expect(container.querySelector('a[href="/login"]')).not.toBeNull();
});
test("a valid session with a failed profile load never restarts onboarding", () => {
  mockAuth.user = { profile_loading_error: true };
  render();
  expect(container.textContent).toContain("Ta session est valide");
  expect(container.querySelector('[data-destination]')).toBeNull();
});
