import { filterTradePeriod, formatWinRate, measuredTradeRows } from "./tradeReporting";

test("recent periods include exactly calendar days and exclude unknown/future dates", () => {
  const rows = ["2026-09-30", "2026-10-01", "2026-10-07", "2026-10-08", ""].map(date => ({ date }));
  expect(filterTradePeriod(rows, { days: 7, now: new Date(2026, 9, 7, 20) }).map(row => row.date)).toEqual(["2026-10-01", "2026-10-07"]);
  expect(filterTradePeriod(rows, { days: "all" })).toEqual(rows);
  expect(filterTradePeriod(rows, { start: "2026-10-01", end: "2026-10-01" })).toEqual([{ date: "2026-10-01" }]);
});

test("realized reports never display an open profit or unknown result as measured", () => {
  expect(measuredTradeRows([{ pnl: 10, result_status: "open" }, { pnl: null }, { pnl: 0 }, { pnl: -2 }]).map(trade => trade.pnl)).toEqual([0, -2]);
  expect(formatWinRate(null)).toBe("—");
  expect(formatWinRate(100 / 3)).toBe("33.3%");
});
