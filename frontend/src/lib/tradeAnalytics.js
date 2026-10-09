import { tradeDateKey } from "./tradeCalendar";

export function measuredTradePnl(trade) {
  if (["open", "cancelled", "canceled"].includes(String(trade?.result_status || "").toLowerCase())) return null;
  const pnl = trade?.pnl === null || trade?.pnl === undefined || trade?.pnl === "" ? null : Number(trade.pnl);
  if (!Number.isFinite(pnl)) return null;
  const source = String(trade?.provider_metadata?.pnl_source || "").toLowerCase();
  if (trade?.provider_metadata?.net_pnl_available === false) return null;
  if (["tradelocker", "metaapi"].includes(trade?.source_provider) && trade?.provider_metadata?.net_pnl_available !== true) return null;
  const providerTrade = Boolean(trade?.integration_connection_id || trade?.integration_account_id || trade?.source_provider);
  const costs = trade?.provider_metadata?.instrument_pricing?.tickCost;
  if (source === "derived_tick_cost" && Array.isArray(costs) && !costs.some(row => Number.isFinite(Number(row?.tickCost)) && Number(row?.tickCost) > 0)) return null;
  if (providerTrade && (source === "unavailable" || (pnl === 0 && !source))) return null;
  return pnl;
}

const sumPnl = rows => rows.reduce((sum, trade) => sum + Number(measuredTradePnl(trade) || 0), 0);

export function tradeOutcome(trade) {
  const pnl = measuredTradePnl(trade);
  // A favorable price move can still lose money after commissions and fees.
  return pnl === null ? null : pnl > 0 ? 1 : pnl < 0 ? -1 : 0;
}

export function groupTradesByWeekday(trades) {
  const names = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
  return names.map((name, index) => ({
    name,
    pnl: sumPnl(trades.filter(trade => {
      const key = tradeDateKey(trade.date);
      return key && new Date(`${key}T12:00:00`).getDay() === index;
    })),
  }));
}

export function calculateTradeAnalytics(trades, accounts) {
  const closed = trades
    .map(trade => ({ ...trade, pnl: measuredTradePnl(trade) }))
    .filter(trade => trade.pnl !== null);
  const measuredOutcomes = trades.map(trade => ({ trade, outcome: tradeOutcome(trade) })).filter(item => item.outcome !== null);
  const wins = closed.filter(trade => trade.pnl > 0);
  const losses = closed.filter(trade => trade.pnl < 0);
  const rTrades = trades.filter(trade => Number.isFinite(trade.r) && tradeOutcome(trade) !== null);
  const measuredPlan = trades.filter(trade => trade.plan_respected === true || trade.plan_respected === false);
  const group = key => Object.values(closed.reduce((result, trade) => {
    const name = trade[key] || "Non renseigné";
    result[name] ??= { name, pnl: 0, trades: 0, wins: 0 };
    result[name].pnl += Number(trade.pnl || 0);
    result[name].trades += 1;
    if (Number(trade.pnl) > 0) result[name].wins += 1;
    return result;
  }, {})).sort((a, b) => b.pnl - a.pnl);
  const accountPerformance = accounts.map(account => {
    const accountTrades = closed.filter(trade => trade.account_id === account.id);
    return accountTrades.length ? {
      name: `${account.firm} · ${account.name}`,
      pnl: sumPnl(accountTrades),
    } : null;
  }).filter(Boolean).sort((a, b) => b.pnl - a.pnl);
  const grossWin = sumPnl(wins);
  const grossLoss = Math.abs(sumPnl(losses));
  return {
    pnl: closed.length ? sumPnl(closed) : null,
    winrate: measuredOutcomes.length ? Math.round(measuredOutcomes.filter(item => item.outcome > 0).length / measuredOutcomes.length * 100) : null,
    profitFactor: grossLoss ? grossWin / grossLoss : grossWin > 0 ? Infinity : closed.length ? 0 : null,
    avgWin: wins.length ? grossWin / wins.length : null,
    avgLoss: losses.length ? sumPnl(losses) / losses.length : null,
    planRate: measuredPlan.length
      ? Math.round(measuredPlan.filter(trade => trade.plan_respected === true).length / measuredPlan.length * 100)
      : null,
    avgR: rTrades.length ? rTrades.reduce((sum, trade) => sum + trade.r, 0) / rTrades.length : null,
    total: trades.length,
    wins: measuredOutcomes.filter(item => item.outcome > 0).length,
    losses: measuredOutcomes.filter(item => item.outcome < 0).length,
    assets: group("instrument"),
    sessions: group("session"),
    setups: group("setup"),
    accounts: accountPerformance,
    days: groupTradesByWeekday(trades),
  };
}
