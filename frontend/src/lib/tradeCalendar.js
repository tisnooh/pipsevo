export const tradeDateKey = value => value ? String(value).slice(0, 10) : "";

export function groupTradesByDate(trades) {
  return trades.reduce((groups, trade) => {
    const key = tradeDateKey(trade.date);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return groups;
    groups[key] ||= [];
    groups[key].push(trade);
    return groups;
  }, {});
}

export function buildMonthCells(monthKey, tradesByDate) {
  const [year, month] = monthKey.split("-").map(Number);
  const first = new Date(year, month - 1, 1, 12);
  const mondayOffset = (first.getDay() + 6) % 7;
  const gridStart = new Date(year, month - 1, 1 - mondayOffset, 12);
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const trades = tradesByDate[key] || [];
    const pnl = trades.reduce((sum, trade) => sum + Number(trade.pnl || 0), 0);
    return { key, day: date.getDate(), inMonth: date.getMonth() === month - 1, trades, pnl };
  });
}
