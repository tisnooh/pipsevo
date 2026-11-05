import React, { act } from "react";
import { createRoot } from "react-dom/client";
import Payouts from "./Payouts";
import { accounts, integrationConnections, payouts } from "@/lib/api";
import { toast } from "sonner";
import { formatMoney } from "@/lib/preferences";

const mockConfirm = jest.fn();
const mockSettings = { currency: "USD", timezone: "Europe/Paris", language: "fr" };
jest.mock("@/lib/api", () => ({
  accounts: { list: jest.fn() },
  payouts: { list: jest.fn(), create: jest.fn(), delete: jest.fn() },
  integrationConnections: { list: jest.fn() },
}));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("@/hooks/useAppSettings", () => ({ useAppSettings: () => ({
  settings: mockSettings,
  money: value => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value),
  date: value => String(value),
}) }));
jest.mock("@/lib/appDataEvents", () => ({ listenForAppDataChanges: () => () => {} }));
jest.mock("@/components/CsvExportButton", () => ({ __esModule: true, default: () => <button>Exporter</button> }));
jest.mock("@/components/ConfirmDialog", () => ({ useConfirmDialog: () => ({ confirm: mockConfirm, confirmationDialog: null }) }));

let root;
let container;
const euros = { id: "eur", name: "Compte euro", firm: "Manuel", balance: 51000, initial_balance: 50000, max_drawdown: 2500, current_drawdown: 0 };
const usd = value => formatMoney(value, { settings: mockSettings, currency: "USD" });
const eur = value => formatMoney(value, { settings: mockSettings, currency: "EUR" });
beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  accounts.list.mockReset().mockResolvedValue({ data: [euros, { ...euros, id: "usd", name: "Compte dollar" }] });
  integrationConnections.list.mockReset().mockResolvedValue({ data: [{ integration_accounts: [{ account_id: "eur", currency: "EUR", status: "connected" }] }] });
  payouts.list.mockReset().mockResolvedValue({ data: [{ id: "p1", account_id: "eur", amount: 300, date: "2026-10-01" }, { id: "p2", account_id: "usd", amount: 200, date: "2026-10-02" }] });
  payouts.create.mockReset().mockResolvedValue({ data: { id: "new" } });
  mockConfirm.mockReset().mockResolvedValue(false);
});
afterEach(() => { act(() => root.unmount()); container.remove(); });
const render = async () => act(async () => root.render(<Payouts />));
const click = async label => {
  const button = [...container.querySelectorAll("button")].find(item => item.textContent.trim() === label);
  expect(button).toBeDefined();
  await act(async () => button.click());
};
const change = async (testId, value) => {
  const input = container.querySelector(`[data-testid="${testId}"]`);
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
};
const metric = label => [...container.querySelectorAll("div")].find(item => item.textContent === label)?.nextElementSibling?.textContent;

test("les totaux par devise et l’historique gardent les unités natives", async () => {
  await render();
  expect(metric("Total retiré par devise")).toBe(`${eur(300)} · ${usd(200)}`);
  expect(metric("Retrait prudent")).toBe(eur(1000));
  expect(metric("Retrait prudent")).not.toBe(eur(3000));
  expect(container.textContent).not.toContain("Prochain payout estimé");
  expect(container.textContent).toContain("Scénario de profit saisi");
});

test("une règle absente est présentée comme inconnue, pas comme retrait zéro vérifié", async () => {
  accounts.list.mockResolvedValue({ data: [{ ...euros, max_drawdown: 0 }] });
  await render();
  expect(metric("Retrait prudent")).toBe("—");
  expect(container.querySelector('[role="status"]').textContent).toContain("Estimation indisponible");
});

test("un statut fournisseur en erreur ne donne pas une estimation basée sur un solde périmé", async () => {
  integrationConnections.list.mockResolvedValue({ data: [{ integration_accounts: [{ account_id: "eur", currency: "EUR", status: "error" }] }] });
  await render();
  expect(metric("Retrait prudent")).toBe("—");
});

test("un fournisseur sans seuil ou drawdown rapporté ne reçoit pas de seuil fixe supposé", async () => {
  accounts.list.mockResolvedValue({ data: [{ ...euros, current_drawdown: null }] });
  await render();
  expect(metric("Retrait prudent")).toBe("—");
});

test("la projection invalide n’affiche ni NaN ni une performance fictive", async () => {
  await render();
  await change("sim-days", "-1");
  expect(metric("Scénario de profit saisi")).toBe("—");
  expect(container.textContent).not.toContain("NaN");
});

test("le formulaire utilise la devise du compte et permet d’annuler un retrait excessif", async () => {
  await render();
  await click("Enregistrer un payout");
  expect(container.querySelector("form").textContent).toContain("Montant (EUR)");
  await change("p-amount", "3000");
  await act(async () => container.querySelector("form").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
  expect(mockConfirm).toHaveBeenCalledWith(expect.objectContaining({ title: "Retrait supérieur à l’estimation prudente", description: expect.stringContaining(eur(1000)) }));
  expect(payouts.create).not.toHaveBeenCalled();
});

test("l’enregistrement d’historique n’est pas présenté comme un paiement exécuté", async () => {
  await render();
  await click("Enregistrer un payout");
  expect(container.querySelector("form").textContent).toContain("ne déclenche aucun retrait");
  await act(async () => container.querySelector("form").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
  expect(payouts.create).toHaveBeenCalledWith(expect.objectContaining({ account_id: "eur", amount: 1000 }));
  expect(toast.success).toHaveBeenCalledWith("Payout enregistré");
  expect(mockConfirm).not.toHaveBeenCalled();
});

test("un échec de chargement n’est pas transformé en totaux zéro", async () => {
  payouts.list.mockRejectedValue(new Error("Test indisponible"));
  await render();
  expect(container.textContent).toContain("Test indisponible");
  expect(container.textContent).not.toContain("Total retiré par devise");
});
