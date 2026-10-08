import { tradeCurrency, tradingCurrencyScope, tradingAccountRisk } from "./tradeCurrency";
import { calculateTradeAnalytics } from "./tradeAnalytics";

const trades = [
  { id: "manual", pnl: 490, result_status: "closed" },
  { id: "close1", pnl: -47.72, provider_currency: "EUR", result_status: "closed" },
  { id: "close2", pnl: -10.79, provider_currency: "EUR", result_status: "closed" },
  { id: "open", pnl: -20.12, provider_currency: "EUR", result_status: "open" },
];

test("keeps the provider currency when display preferences use another currency", () => {
  expect(tradeCurrency(trades[1], "GBP")).toBe("EUR");
  expect(tradeCurrency(trades[0], "USD")).toBe("USD");
});

test("does not add EUR and USD P&L or include open positions in realized results", () => {
  const eur = tradingCurrencyScope(trades, "EUR", "USD");
  expect(eur.currencies).toEqual(["EUR", "USD"]);
  expect(eur.trades).toHaveLength(3);
  const stats = calculateTradeAnalytics(eur.trades, []);
  expect(stats.pnl).toBeCloseTo(-58.51);
  expect(stats.winrate).toBe(0);
  expect(stats.avgLoss).toBeCloseTo(-29.255);
  expect(stats.profitFactor).toBe(0);
  expect(calculateTradeAnalytics(tradingCurrencyScope(trades, "USD").trades, []).pnl).toBe(490);
});

test("automatically follows an account filter with a single native currency", () => {
  expect(tradingCurrencyScope(trades.slice(1), "USD", "USD").currency).toBe("EUR");
  expect(tradingCurrencyScope([], "EUR", "USD").currency).toBe("USD");
});

test("drawdown includes only configured accounts in the selected currency", () => {
  const accounts = [
    { id: "eur", max_drawdown: 2000, current_drawdown: 500, balance: 80000, initial_balance: 80000 },
    { id: "usd", max_drawdown: 4000, current_drawdown: 0 },
    { id: "unconfigured", max_drawdown: 0 },
    { id: "disabled", max_drawdown: 1000 },
  ];
  const providers = { eur: { currency: "EUR", status: "connected" }, disabled: { currency: "EUR", status: "error" } };
  expect(tradingAccountRisk(accounts, [], "EUR", "USD", providers)).toEqual({ count: 1, limit: 2000, remaining: 1500, rate: 75 });
  expect(tradingAccountRisk(accounts, [], "USD", "USD", providers).remaining).toBe(4000);
  expect(tradingAccountRisk(accounts, [], "GBP", "USD", providers).remaining).toBeNull();
});
