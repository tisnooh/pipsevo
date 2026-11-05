import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import Onboarding from "./Onboarding";
import { onboarding } from "@/lib/api";
import { toast } from "sonner";

const mockSetUser = jest.fn();
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({ ...jest.requireActual("react-router-dom"), useNavigate: () => mockNavigate }));
jest.mock("@/context/AuthContext", () => ({ useAuth: () => ({ user: { id: "fixture", name: "Alex" }, setUser: mockSetUser }) }));
jest.mock("@/lib/api", () => ({ onboarding: jest.fn() }));
jest.mock("@/components/LanguageSwitcher", () => () => null);
jest.mock("@/components/TradingRulesEditor", () => ({
  __esModule: true,
  DEFAULT_TRADING_RULES: { max_trades: 3, daily_loss_limit: 300, daily_loss_currency: "USD", max_risk_pct: 1, stop_after_loss: 2, min_rr: 1.5, max_session_minutes: 240, pre_trade_checklist: [] },
  normalizeTradingRules: value => value,
  default: ({ value, onChange }) => <label>Trades maximum<input value={value.max_trades} onChange={event => onChange({ ...value, max_trades: Number(event.target.value) })}/></label>,
}));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

let root, container;
beforeEach(async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true; jest.clearAllMocks();
  onboarding.mockResolvedValue({ data: { id: "fixture", onboarded: true, onboarding_completed: true } });
  container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container);
  await act(async () => root.render(<MemoryRouter><Onboarding/></MemoryRouter>));
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });
const click = async selector => act(async () => container.querySelector(selector).click());
const clickText = async text => act(async () => [...container.querySelectorAll("button")].find(button => button.textContent.startsWith(text)).click());
const fill = async (input, value) => act(async () => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
});
const toCountStep = async () => {
  await click('[data-testid="onb-next"]');
  await click('[data-testid="onb-asset-indices_futures"]');
  await clickText("NQ");
  await click('[data-testid="onb-next"]');
  await click('[data-testid="onb-next"]');
  await click('[data-testid^="onb-firm-"]');
  await click('[data-testid="onb-next"]');
};

test("the account count must be a whole number before continuing", async () => {
  await toCountStep();
  const input = container.querySelector('[data-testid="onb-num-accounts"]');
  for (const value of ["", "0", "1.5", "51"]) {
    await fill(input, value); expect(container.querySelector('[data-testid="onb-next"]').disabled).toBe(true);
  }
  await fill(input, "2"); expect(container.querySelector('[data-testid="onb-next"]').disabled).toBe(false);
  expect(onboarding).not.toHaveBeenCalled();
});

test("configure-later persists unconfirmed draft rules without claiming they apply", async () => {
  await toCountStep(); await click('[data-testid="onb-next"]'); await clickText("Ajouter ultérieurement");
  expect(container.textContent).toContain("ne seront pas appliquées avant confirmation");
  await click('[data-testid="onb-finish"]');
  expect(onboarding).toHaveBeenCalledWith(expect.objectContaining({ num_accounts: 1, rules: expect.objectContaining({ configured: false, daily_loss_currency: "USD" }) }));
  expect(mockNavigate).toHaveBeenCalledWith("/app/accounts?setup=1&welcome=1", { replace: true });
});

test("invalid rule values cannot complete onboarding", async () => {
  await toCountStep(); await click('[data-testid="onb-next"]');
  await fill(container.querySelector("label input"), "0");
  expect(container.querySelector('[data-testid="onb-finish"]').disabled).toBe(true);
  expect(onboarding).not.toHaveBeenCalled();
});

test("save failure keeps the onboarding draft and does not navigate or announce success", async () => {
  await toCountStep(); await click('[data-testid="onb-next"]');
  let reject; onboarding.mockReturnValue(new Promise((_, fail) => { reject = fail; }));
  await click('[data-testid="onb-finish"]');
  expect(container.querySelector("fieldset").disabled).toBe(true);
  await act(async () => reject(new Error("offline")));
  expect(container.querySelector("fieldset").disabled).toBe(false);
  expect(toast.success).not.toHaveBeenCalled(); expect(mockNavigate).not.toHaveBeenCalled(); expect(mockSetUser).not.toHaveBeenCalled();
});
