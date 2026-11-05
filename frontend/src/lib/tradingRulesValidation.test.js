import { tradingRulesValidation } from "./tradingRulesValidation";
const rules = { max_trades: 3, daily_loss_limit: 300, max_risk_pct: 1, stop_after_loss: 2, min_rr: 1.5, max_session_minutes: 240 };
test("valid protection limits are accepted", () => expect(tradingRulesValidation(rules).valid).toBe(true));
test.each([
  ["max_trades", 0], ["max_trades", 1.5], ["daily_loss_limit", -1], ["daily_loss_limit", NaN],
  ["max_risk_pct", 11], ["stop_after_loss", 21], ["min_rr", Infinity], ["max_session_minutes", 0], ["max_session_minutes", "60"],
])("%s rejects an invalid value %s", (key, value) => {
  expect(tradingRulesValidation({ ...rules, [key]: value })).toMatchObject({ valid: false, message: expect.any(String) });
});
