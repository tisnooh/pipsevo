import { accountFinancialPayload, clockInput, finiteInput, validateTradeCurrency } from "./financialPayloads";

test("CSV timestamps become native clock columns, without timezone guessing", () => {
  expect(clockInput("2026-10-10T09:30:22Z")).toBe("09:30:22");
  expect(clockInput("2026.10.10 9:30:22")).toBe("09:30:22");
  expect(clockInput("09:30")).toBe("09:30:00");
  expect(clockInput("2026-10-10")).toBeNull();
  expect(() => clockInput("24:00")).toThrow();
  expect(() => clockInput("10:60:00")).toThrow();
});

test("money must be finite and known; absent is not zero", () => {
  expect(finiteInput(null, "PnL")).toBeNull();
  expect(finiteInput(0, "PnL")).toBe(0);
  for (const value of [false, [], Infinity, NaN, " "]) expect(() => finiteInput(value, "PnL")).toThrow();
  expect(() => accountFinancialPayload({ balance: "" })).toThrow();
});

test("manual balances recompute legacy static drawdown, provider balances remain read-only", () => {
  expect(accountFinancialPayload({ balance: 48000 }, { initial_balance: 50000, current_drawdown: 0 })).toEqual({ balance: 48000, current_drawdown: 2000 });
  expect(accountFinancialPayload({ balance: 60000, current_drawdown: 0, profit_target: 5000 }, { integration_account_id: "linked", balance: 49000 })).toEqual({ profit_target: 5000 });
  expect(accountFinancialPayload({ balance: 51000, current_drawdown: 1500 }, { initial_balance: 50000 })).toEqual({ balance: 51000, current_drawdown: 1500 });
});

test("native amounts cannot be relabelled by a preference or CSV", () => {
  expect(validateTradeCurrency({ pnl: 40 }, { currency: "EUR" })).toEqual({ pnl: 40, provider_currency: "EUR" });
  expect(() => validateTradeCurrency({ pnl: 40, provider_currency: "EUR" }, { currency: "USD" })).toThrow();
  expect(() => validateTradeCurrency({ pnl: 40 }, { currency_available: false })).toThrow();
});
