import { measuredTradePnl } from "./tradeAnalytics";
import { finiteFinancialNumber, resolveAccountDrawdown } from "./riskEngine";

const closedTrade = (trade) => !["open", "cancelled", "canceled"].includes(String(trade?.result_status || "").toLowerCase());

export function getAccountDisplayMetrics(account, accountTrades = [], providerAccount = null, fallbackCurrency = "USD") {
  const isSynced = Boolean(providerAccount || account?.source_provider || account?.integration_account_id || accountTrades.some((trade) => trade.integration_account_id || trade.source_provider));
  const native = providerAccount?.currency || account?.currency || accountTrades.find(trade => trade.provider_currency)?.provider_currency;
  const currencyAvailable = account?.currency_available !== false && Boolean(native || !isSynced);
  const currency = currencyAvailable ? String(native || "USD").toUpperCase() : "UNKNOWN";
  const allClosedTrades = accountTrades.filter(closedTrade);
  const closedTrades = allClosedTrades.filter(trade => String(trade.provider_currency || trade.currency || account?.currency || "USD").toUpperCase() === currency);
  const measuredPnls = closedTrades
    .map(measuredTradePnl)
    .filter((pnl) => pnl !== null);
  const risk = !currencyAvailable || providerAccount?.status === "error" ? null : resolveAccountDrawdown(account, { allowStaticEstimate: !isSynced });
  const balance = currencyAvailable ? finiteFinancialNumber(account?.balance) : null;
  const initial = finiteFinancialNumber(account?.initial_balance);
  const health = finiteFinancialNumber(account?.health_score);
  const survival = finiteFinancialNumber(account?.survival_score);

  return {
    balance,
    currency,
    currencyAvailable,
    isSynced,
    healthScore: risk && health !== null ? Math.max(0, Math.min(100, health)) : null,
    survivalScore: risk && survival !== null ? Math.max(0, Math.min(100, survival)) : null,
    drawdownUsed: risk?.drawdownUsed ?? null,
    drawdownSource: risk?.source || null,
    pnlMeasuredCount: measuredPnls.length,
    pnlUnknownCount: closedTrades.length - measuredPnls.length,
    pnlOtherCurrencyCount: allClosedTrades.length - closedTrades.length,
    pnl: measuredPnls.length ? measuredPnls.reduce((sum, pnl) => sum + pnl, 0)
      : isSynced || allClosedTrades.length || balance === null || initial === null ? null : balance - initial,
    syncStatus: providerAccount?.status || null,
    syncErrorCode: providerAccount?.last_error_code || null,
    syncErrorMessage: providerAccount?.last_error_message || null,
    lastSuccessfulSyncAt: providerAccount?.last_successful_sync_at || null,
  };
}
