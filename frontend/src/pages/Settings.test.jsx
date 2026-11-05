import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import Settings from "./Settings";
import { auth, newsletter } from "@/lib/api";
import { toast } from "sonner";

let mockUser;
const mockSetUser = jest.fn();
jest.mock("@/context/AuthContext", () => ({ useAuth: () => ({ user: mockUser, setUser: mockSetUser }) }));
jest.mock("@/context/I18nContext", () => ({ useI18n: () => ({ setLanguage: jest.fn() }) }));
jest.mock("@/lib/api", () => ({ auth: { update: jest.fn() }, dataExports: { all: jest.fn() }, newsletter: { getPreferences: jest.fn(), updatePreferences: jest.fn() } }));
jest.mock("@/components/IntegrationConnections", () => () => null);
jest.mock("@/components/CommercialBanner", () => () => null);
jest.mock("@/components/motion/MotionPreferenceControl", () => () => null);
jest.mock("@/components/TradingRulesEditor", () => ({
  __esModule: true,
  normalizeTradingRules: value => ({ max_trades: 3, daily_loss_limit: 300, max_risk_pct: 1, stop_after_loss: 2, min_rr: 1.5, max_session_minutes: 240, pre_trade_checklist: [], custom_rules: [], ...value }),
  default: ({ value, onChange }) => <label>Trades maximum<input value={value.max_trades} onChange={e => onChange({ ...value, max_trades: Number(e.target.value) })}/></label>,
}));
jest.mock("@/components/JournalPreferencesEditor", () => ({ value, onChange, onChecklistChange }) => <div>
  <button onClick={() => onChange({ ...value, favoriteInstruments: ["NQ"] })}>Ajouter un favori</button>
  <button onClick={() => onChecklistChange([{ id: "check", label: "Mon contrôle", enabled: true }])}>Modifier la checklist</button>
</div>);
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn() } }));

let root, container;
const savedUser = () => ({ id: "a", name: "Alex", trader_type: "futures", rules: { max_trades: 5, configured: true, pre_trade_checklist: [] }, journal_preferences: {} });
beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true; mockUser = savedUser(); jest.clearAllMocks();
  newsletter.getPreferences.mockResolvedValue({ data: { daily_summary: true, risk_alerts: true, payout_updates: true, product_updates: false, trading_education: false, status: "active" } });
  auth.update.mockImplementation(async values => ({ data: { ...mockUser, ...values } }));
  container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });
const render = () => act(async () => root.render(<MemoryRouter><Settings/></MemoryRouter>));
const button = text => [...container.querySelectorAll("button")].find(item => item.textContent === text || item.textContent.startsWith(text));
const click = async text => act(async () => button(text).click());
const field = text => [...container.querySelectorAll("label")].find(item => item.textContent.startsWith(text)).querySelector("input");
const fill = async (input, value) => act(async () => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
});
const preferencesResponse = values => ({ data: { daily_summary: true, risk_alerts: true, payout_updates: true, product_updates: false, trading_education: false, status: "active", ...values } });
const toggle = label => container.querySelector(`button[role="switch"][aria-label="${label}"]`);
const defer = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };

test("beta billing shows only available features and never an obsolete paid renewal", async () => {
  mockUser = { ...savedUser(), plan: "pro", subscription_status: "inactive", current_period_end: "2030-01-15T00:00:00Z" };
  await render(); await click("Abonnement");
  expect(container.textContent).toContain("Accès bêta gratuit");
  expect(container.textContent).toContain("Aucun prélèvement");
  expect(container.textContent).toContain("Non requis");
  expect(container.textContent).not.toContain("inactive");
  expect(container.textContent).not.toContain("15/01/2030");
  expect(container.textContent).not.toContain("mt5AutoSync");
  expect(container.textContent).not.toContain("Automatisations premium");
  expect(button("Gérer ou annuler l’abonnement").disabled).toBe(true);
});

test("profile hydration and background refresh do not overwrite a local draft", async () => {
  mockUser = null; await render(); mockUser = savedUser(); await render();
  expect(field("Nom complet").value).toBe("Alex");
  await fill(field("Nom complet"), "Local draft"); mockUser = { ...mockUser, name: "Other saved name" }; await render();
  expect(field("Nom complet").value).toBe("Local draft");
});
test("saving journal options does not silently save an unrelated risk draft", async () => {
  await render(); await click("Règles de trading"); await fill(field("Trades maximum"), "9");
  await click("Préférences du journal"); await click("Ajouter un favori"); await click("Enregistrer les préférences");
  expect(auth.update).toHaveBeenCalledWith({ journal_preferences: expect.objectContaining({ favoriteInstruments: ["NQ"] }) });
  await click("Règles de trading"); expect(field("Trades maximum").value).toBe("9");
});
test("journal checklist saves preserve the last saved protection limits", async () => {
  await render(); await click("Règles de trading"); await fill(field("Trades maximum"), "9");
  await click("Préférences du journal"); await click("Modifier la checklist"); await click("Enregistrer les préférences");
  expect(auth.update).toHaveBeenCalledWith(expect.objectContaining({ rules: expect.objectContaining({ max_trades: 5, pre_trade_checklist: [{ id: "check", label: "Mon contrôle", enabled: true }] }) }));
});
test("invalid protection limits are rejected before any request", async () => {
  await render(); await click("Règles de trading"); await fill(field("Trades maximum"), "0"); await click("Enregistrer mes règles");
  expect(auth.update).not.toHaveBeenCalled(); expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("Trades maximum"));
});
test("failed profile save keeps the form and never reports success", async () => {
  await render(); auth.update.mockRejectedValue(new Error("network")); await fill(field("Nom complet"), "Draft");
  await act(async () => container.querySelector("form").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
  expect(field("Nom complet").value).toBe("Draft"); expect(toast.success).not.toHaveBeenCalled(); expect(mockSetUser).not.toHaveBeenCalled();
});

test("notification choices remain locked until the stored consent is loaded", async () => {
  const pending = defer(); newsletter.getPreferences.mockReturnValue(pending.promise);
  await render(); await click("Notifications");
  expect(toggle("Nouveautés PipsEvo").closest("fieldset").disabled).toBe(true);
  expect(button("Enregistrer").disabled).toBe(true);
  await act(async () => pending.resolve(preferencesResponse({ product_updates: true })));
  expect(toggle("Nouveautés PipsEvo").getAttribute("aria-checked")).toBe("true");
  expect(toggle("Nouveautés PipsEvo").closest("fieldset").disabled).toBe(false);
});

test("failed consent loading cannot be overwritten by device defaults and can be retried", async () => {
  newsletter.getPreferences.mockRejectedValueOnce(new Error("offline"));
  await render(); await click("Notifications");
  expect(button("Enregistrer").disabled).toBe(true);
  expect(toggle("Nouveautés PipsEvo").closest("fieldset").disabled).toBe(true);
  await click("Recharger les préférences");
  expect(newsletter.getPreferences).toHaveBeenCalledTimes(2);
  expect(button("Enregistrer").disabled).toBe(false);
});

test("notification save uses the server's canonical response and locks concurrent edits", async () => {
  const pending = defer(); newsletter.updatePreferences.mockReturnValue(pending.promise);
  await render(); await click("Notifications");
  await act(async () => toggle("Nouveautés PipsEvo").click());
  await click("Enregistrer");
  expect(toggle("Nouveautés PipsEvo").closest("fieldset").disabled).toBe(true);
  expect(newsletter.updatePreferences).toHaveBeenCalledWith(expect.objectContaining({ product_updates: true }));
  await act(async () => pending.resolve(preferencesResponse({ product_updates: false })));
  expect(toggle("Nouveautés PipsEvo").getAttribute("aria-checked")).toBe("false");
  expect(toast.success).toHaveBeenCalledWith("Préférences e-mail synchronisées");
});

test("an incomplete notification response is not presented as a successful save", async () => {
  newsletter.updatePreferences.mockResolvedValue({ data: { status: "active" } });
  await render(); await click("Notifications"); await click("Enregistrer");
  expect(toast.success).not.toHaveBeenCalled();
  expect(button("Enregistrer").disabled).toBe(true);
  expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("incomplète"));
});

test("a delayed notification save cannot replace the next account's preferences", async () => {
  const pending = defer(); newsletter.updatePreferences.mockReturnValue(pending.promise);
  await render(); await click("Notifications"); await click("Enregistrer");
  mockUser = { ...savedUser(), id: "b" };
  newsletter.getPreferences.mockResolvedValue(preferencesResponse({ product_updates: true }));
  await render();
  await act(async () => pending.resolve(preferencesResponse({ product_updates: false })));
  expect(toggle("Nouveautés PipsEvo").getAttribute("aria-checked")).toBe("true");
  expect(toast.success).not.toHaveBeenCalled();
});
