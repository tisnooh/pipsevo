import React, { memo, useEffect, useMemo, useRef } from "react";
import { createChart, CandlestickSeries, HistogramSeries, ColorType } from "lightweight-charts";
import { aggregateBars } from "./bars";

export default memo(function ReplayChart({ bars, cursor, timeframe, timezone, position, tickSize = "0.25" }) {
  const container = useRef(null);
  const runtime = useRef(null);
  const aggregated = useMemo(() => aggregateBars(bars, timeframe, cursor), [bars, timeframe, cursor]);
  useEffect(() => {
    const chart = createChart(container.current, {
      autoSize: true, height: 420,
      layout: { background: { type: ColorType.Solid, color: "#090E1C" }, textColor: "#9CA3AF", attributionLogo: true },
      grid: { vertLines: { color: "#171D30" }, horzLines: { color: "#171D30" } },
      rightPriceScale: { borderColor: "#252D45" },
      timeScale: { timeVisible: true, secondsVisible: false, borderColor: "#252D45" },
    });
    const candles = chart.addSeries(CandlestickSeries, { upColor: "#46C99A", downColor: "#F26A70", borderVisible: false, wickUpColor: "#46C99A", wickDownColor: "#F26A70" });
    const volume = chart.addSeries(HistogramSeries, { priceFormat: { type: "volume" }, priceScaleId: "volume" });
    volume.priceScale().applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });
    candles.priceScale().applyOptions({ scaleMargins: { top: 0.08, bottom: 0.2 } });
    runtime.current = { chart, candles, volume, first: null, last: null, timeframe: null, lines: [] };
    return () => { chart.remove(); runtime.current = null; };
  }, []);

  useEffect(() => {
    const r = runtime.current;
    const precision = tickSize.includes(".") ? tickSize.split(".")[1].length : 0;
    r.candles.applyOptions({ priceFormat: { type: "price", minMove: Number(tickSize), precision } });
    r.chart.applyOptions({ localization: { locale: "fr-FR", timeFormatter: time => new Intl.DateTimeFormat("fr-FR", { timeZone: timezone, dateStyle: "short", timeStyle: "short" }).format(new Date(Number(time) * 1000)) } });
  }, [timezone, tickSize]);

  useEffect(() => {
    const r = runtime.current;
    const first = aggregated[0]?.time, last = aggregated[aggregated.length - 1]?.time;
    const volumeRow = b => ({ time: b.time, ...(b.volume === null ? {} : { value: b.volume, color: b.close >= b.open ? "#46C99A40" : "#F26A7040" }) });
    if (r.first !== first || r.timeframe !== timeframe || last < r.last || r.last === null) {
      r.candles.setData(aggregated);
      r.volume.setData(aggregated.map(volumeRow));
      r.chart.timeScale().fitContent();
    } else {
      // Incremental chart updates: no chart remount per replay candle.
      aggregated.filter(b => b.time >= r.last).forEach(b => { r.candles.update(b); r.volume.update(volumeRow(b)); });
    }
    r.first = first; r.last = last; r.timeframe = timeframe;
  }, [aggregated, timeframe]);

  useEffect(() => {
    const r = runtime.current;
    r.lines.forEach(line => r.candles.removePriceLine(line));
    r.lines = position ? [["Entrée", position.entry, "#B58BFF"], ["SL", position.stop_loss, "#F26A70"], ["TP", position.take_profit, "#46C99A"]]
      .filter(([, value]) => value).map(([title, value, color]) => r.candles.createPriceLine({ price: Number(value), title, color, lineWidth: 1, axisLabelVisible: true })) : [];
  }, [position]);

  return <div className="bt-chart pe-card overflow-hidden"><div className="flex items-center justify-between gap-2 px-4 py-2 text-xs text-[#9CA3AF]"><span>{timeframe} · grille UTC · affichage {timezone}</span><button type="button" className="text-[#B58BFF]" onClick={() => container.current.parentElement.requestFullscreen?.()}>Plein écran</button></div><div ref={container} aria-label={`Graphique historique ${timeframe}`} /><div className="px-4 py-2 text-[11px] text-[#9CA3AF]">Dernière bougie agrégée potentiellement partielle · <a href="https://www.tradingview.com/" target="_blank" rel="noreferrer" className="underline">Graphiques TradingView Lightweight Charts™</a></div></div>;
});
