import { aggregateBars, mergeVisibleBars } from "./bars";

const bar = (timestamp, close = "100") => ({ timestamp, open: "100", high: "102", low: "99", close, volume: "10" });
test("future candles cannot enter visible history or an aggregated candle", () => {
  const bars = [bar(0), bar(60, "101"), bar(120, "999")];
  expect(mergeVisibleBars([], bars, 60)).toHaveLength(2);
  expect(aggregateBars(bars, "5m", 60)).toEqual([{ time: 0, open: 100, high: 102, low: 99, close: 101, volume: 20, count: 2 }]);
});
test("gaps remain gaps, timeframe boundaries are deterministic", () => {
  expect(aggregateBars([bar(0), bar(3600)], "5m", 3600).map(b => b.time)).toEqual([0, 3600]);
});
test("rewind trims later bars and deduplication prevents repeated timestamps", () => {
  expect(mergeVisibleBars([bar(0), bar(60)], [bar(60), bar(120)], 60)).toHaveLength(2);
});
test("100k bars yield a bounded 10k chart window", () => {
  const rows = Array.from({ length: 100000 }, (_, i) => bar(i * 60));
  const result = mergeVisibleBars([], rows, 100000 * 60);
  expect(result).toHaveLength(10000);
  expect(result[0].timestamp).toBe(90000 * 60);
});
