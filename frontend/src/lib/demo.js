// Realistic demo data used when the user has no trades yet.
// This ensures the dashboard / journal / statistics never feel empty.

export const DEMO_TRADES = [
  { id: "d1", date: "9 juin 2025 14:32", instrument: "EURUSD", direction: "long", pnl: 320.00, r: 1.32, duration: "2h 15m", account: "Topstep $100K", tags: ["Breakout","News"], entry: 1.07845, exit_price: 1.08123, stop: 1.07610, take_profit: 1.08250 },
  { id: "d2", date: "9 juin 2025 12:17", instrument: "NAS100", direction: "short", pnl: -110.00, r: -0.45, duration: "1h 02m", account: "Apex $50K", tags: ["FVG"] },
  { id: "d3", date: "8 juin 2025 16:45", instrument: "XAUUSD", direction: "long", pnl: 550.00, r: 2.11, duration: "3h 10m", account: "FTMO $100K", tags: ["Trend","TP1"] },
  { id: "d4", date: "8 juin 2025 09:21", instrument: "GBPUSD", direction: "long", pnl: 280.00, r: 1.05, duration: "1h 45m", account: "FundedNext $25K", tags: ["London"] },
  { id: "d5", date: "7 juin 2025 11:03", instrument: "US30", direction: "short", pnl: -210.00, r: -0.78, duration: "2h 05m", account: "Topstep $100K", tags: ["Reversal"] },
  { id: "d6", date: "7 juin 2025 10:11", instrument: "EURUSD", direction: "long", pnl: 150.00, r: 0.65, duration: "54m", account: "Topstep $100K", tags: [] },
  { id: "d7", date: "6 juin 2025 15:32", instrument: "NAS100", direction: "long", pnl: 430.00, r: 1.80, duration: "2h 30m", account: "Apex $50K", tags: ["Breakout","News"] },
  { id: "d8", date: "6 juin 2025 09:47", instrument: "BTCUSD", direction: "short", pnl: -360.00, r: -1.20, duration: "4h 12m", account: "FTMO $100K", tags: ["Volatility"] },
  { id: "d9", date: "5 juin 2025 14:05", instrument: "XAUUSD", direction: "long", pnl: 620.00, r: 2.35, duration: "3h 05m", account: "FundedNext $25K", tags: ["Trend","TP2"] },
  { id: "d10", date: "5 juin 2025 11:22", instrument: "GBPJPY", direction: "short", pnl: -180.00, r: -0.62, duration: "1h 20m", account: "Topstep $100K", tags: [] },
];

export const DEMO_ACCOUNTS = [
  { id: "a1", firm: "Topstep", name: "Combine $100K", balance: 112450, initial_balance: 100000, profit_target: 6000, max_drawdown: 3000, health_score: 92, survival_score: 88 },
  { id: "a2", firm: "Apex", name: "Trader Funding $50K", balance: 53210, initial_balance: 50000, profit_target: 2500, max_drawdown: 2000, health_score: 86, survival_score: 81 },
  { id: "a3", firm: "FTMO", name: "$100K", balance: 101870, initial_balance: 100000, profit_target: 8000, max_drawdown: 5000, health_score: 78, survival_score: 74 },
  { id: "a4", firm: "FundedNext", name: "$25K", balance: 25980, initial_balance: 25000, profit_target: 2000, max_drawdown: 1250, health_score: 71, survival_score: 69 },
  { id: "a5", firm: "The5ers", name: "$50K", balance: 49730, initial_balance: 50000, profit_target: 3000, max_drawdown: 2000, health_score: 58, survival_score: 52 },
];

export const DEMO_KPIS = {
  funded_capital: 325000,
  total_profit: 12450,
  remaining_drawdown: 8240,
  estimated_payout: 3760,
  discipline_score: 94,
  trader_score: 88,
  survival_score: 84,
  total_payouts: 7400,
  active_accounts: 5,
  total_trades: 328,
};

export const DEMO_METRICS = {
  winrate: 62,
  profit_factor: 1.78,
  avg_win: 210.50,
  avg_loss: -118.30,
  plan_respect_rate: 94,
};

export const DEMO_RISK = [
  { k: "Consistency", v: 96 },
  { k: "Emotional Control", v: 92 },
  { k: "Risk Management", v: 95 },
  { k: "Patience", v: 93 },
];

export const DEMO_BEST_ASSETS = [
  { s: "EURUSD", v: 3240 },
  { s: "XAUUSD", v: 2180 },
  { s: "NAS100", v: -780 },
  { s: "GBPUSD", v: -420 },
  { s: "US30", v: 310 },
];

export const DEMO_EQUITY = (() => {
  const arr = [];
  let v = 0;
  const labels = ["10 mai","13 mai","17 mai","20 mai","24 mai","27 mai","31 mai","3 juin","7 juin"];
  const seed = [200,500,300,800,-150,650,900,400,-200,1100,750,300,-400,950,650,800,500,-100,1200,850,750,400,600,1100,500,800,-300,750,900,1200];
  for (let i = 0; i < seed.length; i++) {
    v += seed[i];
    arr.push({ date: labels[Math.floor(i / 3.4)] || "", equity: Math.max(0, v) });
  }
  return arr;
})();

export const DEMO_TRADES_REGISTRY = DEMO_TRADES; // alias for clarity

// Heuristic to know if we should display demo data
export const isEmpty = (arr) => !arr || arr.length === 0;
