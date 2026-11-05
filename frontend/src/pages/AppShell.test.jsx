import React, { act } from "react";
import { createRoot } from "react-dom/client";
import AppShell from "./AppShell";
import { accounts, coach, dashboard, trades } from "@/lib/api";

let mockUser;
jest.mock("@/context/AuthContext", () => ({ useAuth: () => ({ user: mockUser, logout: jest.fn() }) }));
jest.mock("@/context/I18nContext", () => ({ useI18n: () => ({ t: fr => fr }) }));
jest.mock("@/lib/api", () => ({ dashboard: jest.fn(), accounts: { list: jest.fn() }, trades: { list: jest.fn() }, coach: { briefing: jest.fn() } }));
jest.mock("@/lib/appDataEvents", () => ({ listenForAppDataChanges: () => () => {}, notifyAppDataChanged: jest.fn() }));
jest.mock("@/config/billing", () => ({ BILLING_CONFIG: { currentPhase: "beta" }, COMMERCIAL_PHASES: { BETA: "beta" }, canUseFeature: () => true, effectivePlan: () => "beta", PLANS: { beta: { name: "Bêta" } } }));
jest.mock("@/components/LanguageSwitcher", () => () => null);
jest.mock("@/features/admin/ProductOperations", () => ({ AnnouncementBanner: () => null }));
jest.mock("@/components/motion/MotionSystem", () => {
  const React = require("react");
  const Box = ({ children, ...props }) => <div {...props}>{children}</div>;
  return { Presence: ({ show, children }) => show ? children : null, MotionOverlay: Box, MotionPopover: Box, MotionScope: ({ children }) => children };
});
jest.mock("react-router-dom", () => {
  const React = require("react");
  return { NavLink: ({ children, to, className, end, ...props }) => <a href={to} className={typeof className === "function" ? className({ isActive: false }) : className} {...props}>{typeof children === "function" ? children({ isActive: false }) : children}</a>, Outlet: () => null, useLocation: () => ({ pathname: "/app/dashboard" }), useNavigate: () => jest.fn() };
});

let root, container;
const summary = score => ({ kpis: { discipline_score: score, active_accounts: 1, logged_trades: 1, total_trades: 0, total_payouts: null }, metrics: {} });
beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container);
  mockUser = { id: "A", name: "Utilisateur A", rules: {} };
  dashboard.mockReset().mockResolvedValue({ data: summary(65) });
  accounts.list.mockReset().mockResolvedValue({ data: [] });
  trades.list.mockReset().mockResolvedValue({ data: [] });
  coach.briefing.mockReset().mockResolvedValue({ data: { alerts: [] } });
  localStorage.clear();
});
afterEach(() => { act(() => root.unmount()); container.remove(); });
const render = async () => act(async () => root.render(<AppShell />));
const openNotifications = async () => act(async () => container.querySelector('[data-testid="top-notifs"]').click());

test("une erreur réseau ne se transforme pas en absence d’alerte ou validation du risque", async () => {
  dashboard.mockRejectedValue(new Error("network"));
  await render(); await openNotifications();
  expect(container.textContent).toContain("Impossible de vérifier les alertes");
  expect(container.textContent).not.toContain("Aucune alerte détectée");
  expect(container.querySelector('[data-testid="shell-discipline-score"]').textContent).toBe("—");
  dashboard.mockResolvedValue({ data: summary(80) });
  await act(async () => [...container.querySelectorAll("button")].find(button => button.textContent === "Réessayer").click());
  expect(container.querySelector('[data-testid="shell-discipline-score"]').textContent).toBe("80");
});

test("un échec Atlas est explicitement partiel même si les autres lectures réussissent", async () => {
  coach.briefing.mockRejectedValue(new Error("unavailable"));
  await render(); await openNotifications();
  expect(container.textContent).toContain("Les alertes Atlas ne sont pas disponibles");
  expect(container.textContent).not.toContain("Aucune alerte détectée");
});

test("une ancienne réponse ne peut pas afficher le score de l’ancien compte", async () => {
  let finishA;
  dashboard.mockImplementationOnce(() => new Promise(resolve => { finishA = resolve; }));
  await render();
  mockUser = { id: "B", name: "Utilisateur B", rules: {} };
  dashboard.mockResolvedValue({ data: summary(30) });
  await render();
  await act(async () => finishA({ data: summary(99) }));
  expect(container.querySelector('[data-testid="shell-discipline-score"]').textContent).toBe("30");
});

test("un trade ouvert déjà journalisé n’entraîne pas une demande de premier trade", async () => {
  await render(); await openNotifications();
  expect(container.textContent).not.toContain("Journalise ton premier trade");
  expect(container.textContent).not.toContain("Configure ton objectif de payout");
  expect(container.textContent).toContain("Discipline du journal");
  expect(container.textContent).toContain("Indice indicatif du respect du plan");
  expect(container.textContent).toContain("Aucune alerte détectée dans les données disponibles");
});
