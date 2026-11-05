import { localDateKey, tradeDateKey, tradeClosureOrderKey } from "./tradeCalendar";
import { measuredTradePnl } from "./tradeAnalytics";
import { tradeCurrency } from "./tradeCurrency";
import { finiteFinancialNumber } from "./riskEngine";

const closedTrade = trade => !["open", "cancelled", "canceled"].includes(String(trade.result_status || "").toLowerCase());
const activeTrade = trade => !["cancelled", "canceled"].includes(String(trade.result_status || "").toLowerCase());

export function confirmedLossStreak(trades = []) {
  let count = 0;
  for (const trade of trades.filter(closedTrade).sort((a, b) => tradeClosureOrderKey(b).localeCompare(tradeClosureOrderKey(a)))) {
    const pnl = measuredTradePnl(trade);
    if (pnl === null) return { count, complete: false };
    if (pnl < 0) count += 1;
    else break;
  }
  return { count, complete: true };
}

export function disciplineInsights(trades = [], { today = localDateKey(), currency = "USD" } = {}) {
  const todayTrades = trades.filter(trade => activeTrade(trade) && tradeDateKey(trade.date) === today);
  const todayClosed = todayTrades.filter(trade => closedTrade(trade) && tradeCurrency(trade, "USD") === currency);
  const measured = todayClosed.map(measuredTradePnl);
  const unknownCount = measured.filter(value => value === null).length;
  const plans = trades.filter(trade => activeTrade(trade) && typeof trade.plan_respected === "boolean");
  return {
    todayCount: todayTrades.length,
    todayClosedCount: todayClosed.length,
    todayPnl: unknownCount ? null : measured.reduce((sum, pnl) => sum + pnl, 0),
    unknownCount,
    streak: confirmedLossStreak(trades),
    violations: plans.filter(trade => !trade.plan_respected).length,
    planCount: plans.length,
    planRate: plans.length ? plans.filter(trade => trade.plan_respected).length / plans.length * 100 : null,
  };
}

export function configuredDisciplineRules(rules = {}) {
  rules = rules?.configured === false ? {} : (rules || {});
  const maxTrades = finiteFinancialNumber(rules.max_trades);
  const stopAfter = finiteFinancialNumber(rules.stop_after_loss);
  const dailyLimit = finiteFinancialNumber(rules.daily_loss_limit);
  return {
    maxTrades: maxTrades > 0 && Number.isInteger(maxTrades) ? maxTrades : null,
    stopAfter: stopAfter > 0 && Number.isInteger(stopAfter) ? stopAfter : null,
    dailyLimit: dailyLimit > 0 ? dailyLimit : null,
    dailyCurrency: String(rules.daily_loss_currency || rules.currency || "USD").toUpperCase(),
  };
}
