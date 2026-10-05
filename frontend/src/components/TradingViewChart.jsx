import React, { useMemo } from "react";
import { useTheme } from "next-themes";

export default function TradingViewChart({ symbol = "OANDA:EURUSD", interval = "60" }) {
  const { resolvedTheme } = useTheme();
  const theme = resolvedTheme === "light" ? "light" : "dark";
  const source = useMemo(() => {
    const light = theme === "light";
    const background = light ? "#FFFFFF" : "#131722";
    const config = JSON.stringify({
      autosize: true,
      symbol,
      interval,
      timezone: "Europe/Paris",
      theme,
      style: "1",
      locale: "fr",
      backgroundColor: background,
      gridColor: light ? "rgba(79,93,132,0.12)" : "rgba(255,255,255,0.04)",
      allow_symbol_change: true,
      hide_side_toolbar: false,
      hide_top_toolbar: false,
      hide_legend: false,
      hide_volume: false,
      save_image: true,
      calendar: false,
      withdateranges: true,
      support_host: "https://www.tradingview.com",
    });

    return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body,.tradingview-widget-container{width:100%;height:100%;margin:0;overflow:hidden;background:${background};color-scheme:${theme}}.tradingview-widget-container__widget{height:calc(100% - 28px);width:100%}.tradingview-widget-copyright{height:28px;display:flex;align-items:center;justify-content:center;font:11px system-ui;color:${light ? "#647086" : "#9CA3AF"}}.tradingview-widget-copyright a{color:${light ? "#3475E6" : "#8B9DC3"};text-decoration:none}</style></head><body><div class="tradingview-widget-container"><div class="tradingview-widget-container__widget"></div><div class="tradingview-widget-copyright"><a href="https://www.tradingview.com/" rel="noopener nofollow" target="_blank">Graphique</a>&nbsp;par TradingView</div><script type="text/javascript" src="https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js" async>${config}</script></div></body></html>`;
  }, [symbol, interval, theme]);

  return (
    <iframe
      key={`${symbol}-${interval}-${theme}`}
      title={`Graphique TradingView ${symbol}`}
      srcDoc={source}
      className="h-full w-full border-0"
      sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
    />
  );
}
