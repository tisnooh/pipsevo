// Provider amounts are already denominated in the account currency. Changing
// display preferences must never relabel them or silently convert their value.
export function tradeCurrency(trade, fallback = "USD") {
  return String(trade?.provider_currency || trade?.currency || fallback).toUpperCase();
}

export function tradingCurrencyScope(trades, selectedCurrency = "", fallback = "USD") {
  const currencies = [...new Set(trades.map(trade => tradeCurrency(trade, fallback)))].sort();
  const currency = currencies.includes(selectedCurrency)
    ? selectedCurrency
    : currencies.includes(fallback) ? fallback : currencies[0] || fallback;
  return {
    currency,
    currencies,
    trades: trades.filter(trade => tradeCurrency(trade, fallback) === currency),
  };
}

export function tradingAccountRisk(accounts, trades, currency, fallback = "USD", providerAccounts = {}, accountId = "") {
  const configured = accounts.filter(account => {
    const provider = providerAccounts[account.id];
    const accountTrade = trades.find(trade => trade.account_id === account.id && trade.provider_currency);
    const nativeCurrency = String(provider?.currency || accountTrade?.provider_currency || account.currency || fallback).toUpperCase();
    return (!accountId || account.id === accountId) && (account.status || "active") === "active"
      && provider?.status !== "error" && nativeCurrency === currency && Number(account.max_drawdown) > 0;
  });
  const limit = configured.reduce((sum, account) => sum + Number(account.max_drawdown), 0);
  const remaining = configured.length ? configured.reduce((sum, account) => {
    const used = Math.max(0, Number(account.current_drawdown ?? Math.max(0, Number(account.initial_balance) - Number(account.balance))));
    return sum + Math.max(0, Number(account.max_drawdown) - used);
  }, 0) : null;
  return { count: configured.length, limit, remaining, rate: limit ? remaining / limit * 100 : 0 };
}
