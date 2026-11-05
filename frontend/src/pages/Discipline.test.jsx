import React, { act } from "react";
import { createRoot } from "react-dom/client";
import Discipline from "./Discipline";
import { accounts, trades } from "@/lib/api";
import { localDateKey } from "@/lib/tradeCalendar";

let mockRules = {};
jest.mock("@/lib/api", () => ({ accounts: { list: jest.fn() }, trades: { list: jest.fn() } }));
jest.mock("@/context/AuthContext", () => ({ useAuth: () => ({ user: { rules: mockRules } }) }));
jest.mock("@/hooks/useAppSettings", () => ({ useAppSettings: () => ({ settings: { currency: "USD", language: "fr" } }) }));
jest.mock("@/lib/appDataEvents", () => ({ listenForAppDataChanges: () => () => {} }));

let root;
let container;
beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  mockRules = {};
  accounts.list.mockReset().mockResolvedValue({ data: [{ id: "a1", name: "Compte", balance: 50000, initial_balance: 50000, max_drawdown: 2500, daily_loss_limit: 0 }] });
  trades.list.mockReset().mockResolvedValue({ data: [{ account_id: "a1", date: localDateKey(), pnl: 10, provider_currency: "USD", plan_respected: null }] });
});
afterEach(() => { act(() => root.unmount()); container.remove(); });
const render = async () => act(async () => root.render(<Discipline />));
const rule = name => container.querySelector(`[data-rule="${name}"]`);

test("les règles absentes et le respect du plan absent restent non vérifiés", async () => {
  await render();
  expect(rule("Nombre de trades").dataset.state).toBe("unknown");
  expect(rule("Nombre de trades").textContent).toContain("limite à configurer");
  expect(rule("Stop après pertes").dataset.state).toBe("unknown");
  expect(rule("Plan respecté").dataset.state).toBe("unknown");
  expect(container.textContent).toContain("—/100");
  expect(container.textContent).not.toContain("Arrêt recommandé à 2");
});

test("le seuil journalier n’ajoute pas EUR et USD et l’égalité est une violation", async () => {
  mockRules = { daily_loss_limit: 100, max_trades: 3, stop_after_loss: 2 };
  trades.list.mockResolvedValue({ data: [
    { account_id: "a1", date: localDateKey(), pnl: -100, provider_currency: "USD", plan_respected: true },
    { account_id: "a2", date: localDateKey(), pnl: 1000, provider_currency: "EUR", plan_respected: false },
  ] });
  await render();
  expect(rule("Limite de perte quotidienne").dataset.state).toBe("violation");
  const select = container.querySelector('[data-testid="discipline-currency"]');
  await act(async () => { select.value = "EUR"; select.dispatchEvent(new Event("change", { bubbles: true })); });
  expect(rule("Limite de perte quotidienne").dataset.state).toBe("unknown");
  expect(rule("Limite de perte quotidienne").textContent).toContain("Limite globale en USD");
  expect(rule("Limite de perte quotidienne").textContent).toContain("Aucune conversion automatique");
});

test("une clôture inconnue ne certifie ni limite journalière ni série de pertes", async () => {
  mockRules = { daily_loss_limit: 100, stop_after_loss: 2 };
  trades.list.mockResolvedValue({ data: [{ account_id: "a1", date: localDateKey(), pnl: null, provider_currency: "USD" }] });
  await render();
  expect(rule("Limite de perte quotidienne").dataset.state).toBe("unknown");
  expect(rule("Stop après pertes").dataset.state).toBe("unknown");
  expect(rule("Stop après pertes").textContent).toContain("historique incomplet");
});

test("une position ouverte n’annule pas la série de pertes clôturées", async () => {
  mockRules = { stop_after_loss: 2 };
  trades.list.mockResolvedValue({ data: [
    { account_id: "a1", date: `${localDateKey()}T12:00:00Z`, pnl: 500, result_status: "open" },
    { account_id: "a1", date: `${localDateKey()}T11:00:00Z`, pnl: -10, result_status: "loser" },
    { account_id: "a1", date: `${localDateKey()}T10:00:00Z`, pnl: -10, result_status: "closed" },
  ] });
  await render();
  expect(rule("Stop après pertes").dataset.state).toBe("violation");
  expect(rule("Stop après pertes").textContent).toContain("2 perte(s)");
});
