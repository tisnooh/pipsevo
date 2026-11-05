import React, { act } from "react";
import { createRoot } from "react-dom/client";
import Accounts from "./Accounts";
import { accounts, trades, integrationConnections } from "@/lib/api";

jest.mock("@/lib/api", () => ({ accounts: { list: jest.fn(), update: jest.fn() }, trades: { list: jest.fn() }, integrationConnections: { list: jest.fn() } }));
jest.mock("@/context/AuthContext", () => ({ useAuth: () => ({ user: { trader_type: "futures" } }) }));
jest.mock("@/hooks/useAppSettings", () => ({ useAppSettings: () => ({ settings: { currency: "USD" }, date: value => value }) }));
jest.mock("@/components/AccountSetupFlow", () => () => null);
jest.mock("@/components/CsvExportButton", () => () => null);
jest.mock("@/components/ConfirmDialog", () => ({ useConfirmDialog: () => ({ confirm: jest.fn(), confirmationDialog: null }) }));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

let root, container;
const manual = { id: "a", name: "Manual", firm: "Topstep", market_type: "futures", initial_balance: 50000, balance: 50000, current_drawdown: 0, max_drawdown: 2000, profit_target: 3000, daily_loss_limit: 1000, status: "active" };
beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container);
  jest.clearAllMocks();
  accounts.list.mockResolvedValue({ data: [manual] }); trades.list.mockResolvedValue({ data: [] }); integrationConnections.list.mockResolvedValue({ data: [] }); accounts.update.mockResolvedValue({ data: manual });
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });
const inputFor = prefix => [...container.querySelectorAll("label")].find(label => label.textContent.startsWith(prefix)).querySelector("input");
async function fill(input, value) {
  await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(input, value); input.dispatchEvent(new Event("input", { bubbles: true })); });
}

test("manual balance proposes fixed loss but actual trailing drawdown can be entered", async () => {
  await act(async () => root.render(<Accounts/>));
  await act(async () => container.querySelector('[aria-label="Modifier Manual"]').click());
  await fill(inputFor("Solde actuel"), "49000");
  expect(inputFor("Drawdown utilisé actuel").value).toBe("1000");
  await fill(inputFor("Drawdown utilisé actuel"), "1500");
  await act(async () => container.querySelector("form").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
  expect(accounts.update).toHaveBeenCalledWith("a", expect.objectContaining({ balance: 49000, current_drawdown: 1500 }));
});

test("provider balances and risk observations are visibly read-only", async () => {
  accounts.list.mockResolvedValue({ data: [{ ...manual, name: "Imported", source_provider: "ctrader", integration_account_id: "linked", balance: null, initial_balance: null }] });
  await act(async () => root.render(<Accounts/>));
  await act(async () => container.querySelector('[aria-label="Modifier Imported"]').click());
  expect(inputFor("Solde actuel").disabled).toBe(true);
  expect(inputFor("Solde initial").disabled).toBe(true);
  expect(inputFor("Drawdown utilisé actuel").disabled).toBe(true);
  expect(inputFor("Profit target").disabled).toBe(false);
  expect(container.textContent).toContain("lecture seule");
  expect(container.textContent).not.toContain("Survie");
});
