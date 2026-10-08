import { measuredTradePnl } from "./tradeAnalytics";

const closedTrade = (trade) => String(trade?.result_status || "").toLowerCase() === "closed";

export function getAccountDisplayMetrics(account, accountTrades = [], providerAccount = null, fallbackCurrency = "USD") {
  const isSynced = Boolean(providerAccount || accountTrades.some((trade) => trade.integration_account_id || trade.source_provider));
  const closedTrades = accountTrades.filter(closedTrade);
  const measuredPnls = closedTrades
    .map(measuredTradePnl)
    .filter((pnl) => pnl !== null);
  const currency = providerAccount?.currency
    || accountTrades.find((trade) => trade.provider_currency)?.provider_currency
    || fallbackCurrency;

  return {
    balance: Number(account?.balance || 0),
    currency,
    isSynced,
    pnl: isSynced
      ? measuredPnls.length ? measuredPnls.reduce((sum, pnl) => sum + pnl, 0) : null
      : Number(account?.balance || 0) - Number(account?.initial_balance || 0),
    syncStatus: providerAccount?.status || null,
    syncErrorCode: providerAccount?.last_error_code || null,
    syncErrorMessage: providerAccount?.last_error_message || null,
    lastSuccessfulSyncAt: providerAccount?.last_successful_sync_at || null,
  };
}
