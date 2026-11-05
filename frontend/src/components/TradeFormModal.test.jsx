import React, { act } from "react";
import { createRoot } from "react-dom/client";
import TradeFormModal from "./TradeFormModal";
import { createEmptyTradeForm } from "@/lib/tradeFormModel";

jest.mock("react-router-dom", () => ({ useNavigate: () => jest.fn() }));
jest.mock("@/components/PrivateTradeImage", () => () => null);
let container, root;
beforeEach(() => { global.IS_REACT_ACT_ENVIRONMENT = true; container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container); });
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });

test("manual trade reports a native net result without inventing discipline from an empty plan", async () => {
  const account = { id: "a1", firm: "Topstep", name: "Manuel EUR", currency: "EUR", market_type: "futures" };
  const onSave = jest.fn();
  const form = { ...createEmptyTradeForm(account), instrument: "NQ", pnl: "-20", result_status: "winner" };
  await act(async () => root.render(<TradeFormModal form={form} setForm={jest.fn()} accounts={[account]} user={{ trader_type: "futures" }} checklist={[]} checklistChecks={{}} setChecklistChecks={jest.fn()} saving={false} onClose={jest.fn()} onSave={onSave}/>));
  expect(container.textContent).toContain("P&L net réel (EUR)");
  expect(container.textContent).toContain("Non mesuré (aucune règle obligatoire)");
  await act(async () => container.querySelector("form").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
  expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ pnl: -20, result_status: "loser", provider_currency: "EUR", plan_respected: null }), []);
});

test("a final result remains required before a manual trade can save", async () => {
  const account = { id: "a1", firm: "Topstep", name: "Manuel", market_type: "futures" };
  const onSave = jest.fn();
  const form = { ...createEmptyTradeForm(account), instrument: "NQ" };
  await act(async () => root.render(<TradeFormModal form={form} setForm={jest.fn()} accounts={[account]} user={{ trader_type: "futures" }} checklist={[]} checklistChecks={{}} setChecklistChecks={jest.fn()} saving={false} onClose={jest.fn()} onSave={onSave}/>));
  await act(async () => container.querySelector("form").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
  expect(onSave).not.toHaveBeenCalled();
  expect(container.textContent).toContain("Renseigne le P&L réel");
});

test("provider observations are read-only while annotations remain editable, even if net PnL is unknown", async () => {
  const account = { id: "a1", firm: "Imported", name: "Read-only", currency: "USD", market_type: "futures" };
  const trade = { id: "provider-trade", source_provider: "provider", account_id: "a1", result_status: "closed", pnl: null, plan_respected: true };
  const onSave = jest.fn();
  const form = { ...createEmptyTradeForm(account), instrument: "NQ", pnl: "", result_status: "closed", notes: "My review" };
  await act(async () => root.render(<TradeFormModal editingTrade={trade} form={form} setForm={jest.fn()} accounts={[account]} user={{ trader_type: "futures" }} checklist={[]} checklistChecks={{}} setChecklistChecks={jest.fn()} saving={false} onClose={jest.fn()} onSave={onSave}/>));
  expect(container.querySelector("fieldset[disabled]")).not.toBeNull();
  await act(async () => container.querySelector("form").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
  expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ notes: "My review", plan_respected: true }), []);
  expect(onSave.mock.calls[0][0]).not.toHaveProperty("pnl");
  expect(onSave.mock.calls[0][0]).not.toHaveProperty("result_status");
});
