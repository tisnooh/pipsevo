import { resolveAccountDrawdown } from "./riskEngine";

// Provider amounts are already denominated in the account currency. Changing
// display preferences must never relabel them or silently convert their value.
export function tradeCurrency(trade, fallback = "USD") {
  if (trade?.currency_available === false) return "UNKNOWN";
  const native = String(trade?.provider_currency || trade?.currency || "").trim().toUpperCase();
  if (native) return native;
  return trade?.source_provider || trade?.integration_account_id || trade?.integration_connection_id ? "UNKNOWN" : "USD";
}

export function tradingCurrencyScope(trades, selectedCurrency = "", fallback = "USD") {
  const currencies = [...new Set(trades.map(trade => tradeCurrency(trade, fallback)))].sort();
  const currency = currencies.includes(selectedCurrency)
    ? selectedCurrency
    : currencies.includes(fallback) ? fallback : currencies[0] || fallback;
  return {
    currency,
    currencies,
    trades: trades.filter(trade => tradeCurrency(trade, fallback) === currency).map(trade => currency === "UNKNOWN" ? { ...trade, currency_available: false } : trade),
  };
}

export function tradingAccountRisk(accounts, trades, currency, fallback = "USD", providerAccounts = {}, accountId = "") {
  const configured = accounts.map(account => {
    if (account.currency_available === false) return null;
    const provider = providerAccounts[account.id];
    const accountTrade = trades.find(trade => trade.account_id === account.id && trade.provider_currency);
    const nativeCurrency = String(provider?.currency || accountTrade?.provider_currency || account.currency || "USD").toUpperCase();
    const isSynced = Boolean(provider || account.source_provider || account.integration_account_id || trades.some(trade => trade.account_id === account.id && (trade.source_provider || trade.integration_account_id)));
    const risk = resolveAccountDrawdown(account, { allowStaticEstimate: !isSynced });
    return (!accountId || account.id === accountId) && (account.status || "active") === "active"
      && provider?.status !== "error" && nativeCurrency === currency && risk ? risk : null;
  }).filter(Boolean);
  const limit = configured.reduce((sum, risk) => sum + risk.maxDrawdown, 0);
  const remaining = configured.length ? configured.reduce((sum, risk) => sum + risk.remainingDrawdown, 0) : null;
  return { count: configured.length, limit, remaining, rate: limit ? remaining / limit * 100 : 0 };
}
