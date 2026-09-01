export const CFD_ASSETS = [
  { id: "EURUSD", label: "EUR/USD", family: "Forex", stopUnit: "pip", pointValue: 10, hint: "Lot standard, paire cotée en USD" },
  { id: "GBPUSD", label: "GBP/USD", family: "Forex", stopUnit: "pip", pointValue: 10, hint: "Lot standard, paire cotée en USD" },
  { id: "AUDUSD", label: "AUD/USD", family: "Forex", stopUnit: "pip", pointValue: 10, hint: "Lot standard, paire cotée en USD" },
  { id: "XAUUSD", label: "Or (XAU/USD)", family: "Métaux CFD", stopUnit: "point", pointValue: 1, hint: "Valeur indicative à confirmer chez ton courtier" },
  { id: "NAS100", label: "Nasdaq 100", family: "Indice CFD", stopUnit: "point", pointValue: 1, hint: "Valeur indicative à confirmer chez ton courtier" },
  { id: "SPX500", label: "S&P 500", family: "Indice CFD", stopUnit: "point", pointValue: 1, hint: "Valeur indicative à confirmer chez ton courtier" },
  { id: "US30", label: "Dow Jones 30", family: "Indice CFD", stopUnit: "point", pointValue: 1, hint: "Valeur indicative à confirmer chez ton courtier" },
  { id: "BTCUSD", label: "Bitcoin (BTC/USD)", family: "Crypto CFD", stopUnit: "point", pointValue: 1, hint: "Valeur indicative à confirmer chez ton courtier" },
];

export const FUTURES_CONTRACTS = [
  { id: "MNQ", label: "MNQ — Micro Nasdaq-100", group: "Indices Micro", tickSize: 0.25, tickValue: 0.5 },
  { id: "MES", label: "MES — Micro S&P 500", group: "Indices Micro", tickSize: 0.25, tickValue: 1.25 },
  { id: "MYM", label: "MYM — Micro Dow", group: "Indices Micro", tickSize: 1, tickValue: 0.5 },
  { id: "M2K", label: "M2K — Micro Russell 2000", group: "Indices Micro", tickSize: 0.1, tickValue: 0.5 },
  { id: "NQ", label: "NQ — E-mini Nasdaq-100", group: "Indices E-mini", tickSize: 0.25, tickValue: 5 },
  { id: "ES", label: "ES — E-mini S&P 500", group: "Indices E-mini", tickSize: 0.25, tickValue: 12.5 },
  { id: "MCL", label: "MCL — Micro WTI", group: "Énergie", tickSize: 0.01, tickValue: 1 },
  { id: "CL", label: "CL — WTI Crude Oil", group: "Énergie", tickSize: 0.01, tickValue: 10 },
  { id: "MGC", label: "MGC — Micro Gold", group: "Métaux", tickSize: 0.1, tickValue: 1 },
  { id: "GC", label: "GC — Gold", group: "Métaux", tickSize: 0.1, tickValue: 10 },
];

const positive = value => Math.max(0, Number(value) || 0);

export function calculateCfdSize({ capital, riskPercent, stopDistance, pointValue }) {
  const riskAmount = positive(capital) * (positive(riskPercent) / 100);
  const lossPerLot = positive(stopDistance) * positive(pointValue);
  const lots = lossPerLot > 0 ? riskAmount / lossPerLot : 0;
  return { riskAmount, lossPerLot, lots };
}

export function calculateFuturesSize({ capital, riskPercent, stopTicks, tickValue }) {
  const riskBudget = positive(capital) * (positive(riskPercent) / 100);
  const lossPerContract = positive(stopTicks) * positive(tickValue);
  const contracts = lossPerContract > 0 ? Math.floor(riskBudget / lossPerContract) : 0;
  return {
    riskBudget,
    lossPerContract,
    contracts,
    actualRisk: contracts * lossPerContract,
    unusedRisk: Math.max(0, riskBudget - contracts * lossPerContract),
  };
}
