import { normalizeJournalPreferences } from "./journalPreferences";
import { normalizeTradingRules } from "@/components/TradingRulesEditor";

test("nullable or malformed stored settings do not crash their editors", () => {
  expect(normalizeJournalPreferences(null).sessions.length).toBeGreaterThan(0);
  expect(normalizeTradingRules(null).max_trades).toBe(3);
  expect(normalizeJournalPreferences({ setups: [null, false, {}, "", "FVG", { id: "ob", label: "Order block", hidden: false }] }).setups.map(row => row.label)).toEqual(["FVG", "Order block"]);
  expect(normalizeTradingRules({ pre_trade_checklist: [null, false, {}, { id: "plan", label: "Plan", enabled: true }], custom_rules: [null] })).toMatchObject({ pre_trade_checklist: [{ id: "plan", label: "Plan", enabled: true }], custom_rules: [] });
});

test("the rule's native monetary unit is independent of browser preferences", () => {
  expect(normalizeTradingRules({ daily_loss_limit: 300 }).daily_loss_currency).toBe("USD");
  expect(normalizeTradingRules({ daily_loss_limit: 300, daily_loss_currency: "EUR" }).daily_loss_currency).toBe("EUR");
});
