import { tradeDateKey } from "./tradeCalendar";

const sumPnl = rows => rows.reduce((sum, trade) => sum + Number(trade.pnl || 0), 0);

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
  const closed = trades.filter(trade => typeof trade.pnl === "number");
  const wins = closed.filter(trade => trade.pnl > 0);
  const losses = closed.filter(trade => trade.pnl < 0);
  const rTrades = trades.filter(trade => typeof trade.r === "number");
  const measuredPlan = trades.filter(trade => trade.plan_respected === true || trade.plan_respected === false);
  const group = key => Object.values(trades.reduce((result, trade) => {
    const name = trade[key] || "Non renseigné";
    result[name] ??= { name, pnl: 0, trades: 0, wins: 0 };
    result[name].pnl += Number(trade.pnl || 0);
    result[name].trades += 1;
    if (Number(trade.pnl) > 0) result[name].wins += 1;
    return result;
  }, {})).sort((a, b) => b.pnl - a.pnl);
  const accountPerformance = accounts.map(account => ({
    name: `${account.firm} · ${account.name}`,
    pnl: sumPnl(trades.filter(trade => trade.account_id === account.id)),
  })).sort((a, b) => b.pnl - a.pnl);
  const grossWin = sumPnl(wins);
  const grossLoss = Math.abs(sumPnl(losses));
  return {
    pnl: sumPnl(closed),
    winrate: closed.length ? Math.round(wins.length / closed.length * 100) : 0,
    profitFactor: grossLoss ? grossWin / grossLoss : grossWin || 0,
    avgWin: wins.length ? grossWin / wins.length : 0,
    avgLoss: losses.length ? sumPnl(losses) / losses.length : 0,
    planRate: measuredPlan.length
      ? Math.round(measuredPlan.filter(trade => trade.plan_respected === true).length / measuredPlan.length * 100)
      : null,
    avgR: rTrades.length ? rTrades.reduce((sum, trade) => sum + trade.r, 0) / rTrades.length : null,
    total: trades.length,
    wins: wins.length,
    losses: losses.length,
    assets: group("instrument"),
    sessions: group("session"),
    setups: group("setup"),
    accounts: accountPerformance,
    days: groupTradesByWeekday(trades),
  };
}
