import { localDateKey, tradeDateKey } from "./tradeCalendar";
import { measuredTradePnl } from "./tradeAnalytics";

// Reporting periods are calendar days in the user's browser, not rolling
// 24-hour windows. Every page uses the same inclusive start/end boundaries.
export function filterTradePeriod(trades, { days = "all", start = "", end = "", now = new Date() } = {}) {
  let min = start, max = end;
  if (days !== "all" && Number.isFinite(Number(days)) && Number(days) > 0) {
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - (Number(days) - 1));
    min ||= localDateKey(cutoff);
    max ||= localDateKey(now);
  }
  if (!min && !max) return trades;
  return trades.filter(trade => {
    const key = tradeDateKey(trade.date);
    return /^\d{4}-\d{2}-\d{2}$/.test(key) && (!min || key >= min) && (!max || key <= max);
  });
}

export function measuredTradeRows(trades) {
  return trades.map(trade => ({ ...trade, pnl: measuredTradePnl(trade) })).filter(trade => trade.pnl !== null);
}

export function formatWinRate(value) {
  return value === null || value === undefined ? "—" : `${Number(value).toFixed(1)}%`;
}
