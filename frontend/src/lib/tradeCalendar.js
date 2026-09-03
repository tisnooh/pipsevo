export const tradeDateKey = value => value ? String(value).slice(0, 10) : "";

export const CALENDAR_MONTHS_FR = Object.freeze([
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
]);

export function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function localMonthKey(date = new Date()) {
  return localDateKey(date).slice(0, 7);
}

export function shiftMonthKey(monthKey, amount) {
  const [year, month] = monthKey.split("-").map(Number);
  const absoluteMonth = year * 12 + month - 1 + Number(amount || 0);
  const nextYear = Math.floor(absoluteMonth / 12);
  const nextMonth = ((absoluteMonth % 12) + 12) % 12 + 1;
  return `${nextYear}-${String(nextMonth).padStart(2, "0")}`;
}

export function calendarYears(trades = [], selectedMonthKey = localMonthKey(), currentYear = new Date().getFullYear()) {
  const selectedYear = Number(String(selectedMonthKey).slice(0, 4));
  const years = new Set([
    currentYear,
    selectedYear,
    ...trades.map(trade => Number(tradeDateKey(trade.date).slice(0, 4))),
  ].filter(Number.isFinite));
  const min = Math.min(...years);
  const max = Math.max(...years);
  for (let year = min; year <= max; year += 1) years.add(year);
  return [...years].sort((a, b) => b - a);
}

export function formatMonthLabel(monthKey, locale = "fr-FR") {
  const [year, month] = monthKey.split("-").map(Number);
  return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(Date.UTC(year, month - 1, 1)));
}

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
  const daysInMonth = new Date(year, month, 0, 12).getDate();
  const cellCount = Math.ceil((mondayOffset + daysInMonth) / 7) * 7;
  return Array.from({ length: cellCount }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const trades = tradesByDate[key] || [];
    const pnl = trades.reduce((sum, trade) => sum + Number(trade.pnl || 0), 0);
    return { key, day: date.getDate(), inMonth: date.getMonth() === month - 1, trades, pnl };
  });
}

export function buildTradeCalendarMonth(monthKey, trades = [], locale = "fr-FR") {
  const cells = buildMonthCells(monthKey, groupTradesByDate(trades));
  const monthCells = cells.filter(cell => cell.inMonth);
  const activeCells = monthCells.filter(cell => cell.trades.length > 0);
  return {
    monthKey,
    label: formatMonthLabel(monthKey, locale),
    cells,
    activeDays: activeCells.length,
    tradeCount: activeCells.reduce((sum, cell) => sum + cell.trades.length, 0),
    pnl: activeCells.reduce((sum, cell) => sum + cell.pnl, 0),
  };
}
