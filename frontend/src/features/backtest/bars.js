export const TIMEFRAMES = { "1m": 60, "5m": 300, "15m": 900, "1h": 3600, "4h": 14400 };

// UTC-aligned buckets, never from future bars. Partial candles are explicitly
// labelled in the UI. No interpolation across exchange closures/data gaps.
export function aggregateBars(bars, timeframe, cursor) {
  const duration = TIMEFRAMES[timeframe];
  if (!duration) throw new Error("Unité de temps invalide");
  const groups = [];
  for (const bar of bars) {
    if (bar.timestamp > cursor) continue;
    const time = Math.floor(bar.timestamp / duration) * duration;
    const last = groups[groups.length - 1];
    const volume = bar.volume === null ? null : Number(bar.volume);
    if (last?.time === time) {
      last.high = Math.max(last.high, Number(bar.high));
      last.low = Math.min(last.low, Number(bar.low));
      last.close = Number(bar.close);
      last.volume = last.volume === null || volume === null ? null : last.volume + volume;
      last.count += 1;
    } else {
      groups.push({ time, open: Number(bar.open), high: Number(bar.high), low: Number(bar.low), close: Number(bar.close), volume, count: 1 });
    }
  }
  return groups;
}

export function mergeVisibleBars(previous, incoming, cursor, limit = 10000) {
  const rows = new Map();
  [...previous, ...incoming].forEach(bar => { if (bar.timestamp <= cursor) rows.set(bar.timestamp, bar); });
  return [...rows.values()].sort((a, b) => a.timestamp - b.timestamp).slice(-limit);
}
