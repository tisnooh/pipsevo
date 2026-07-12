import React, { useEffect, useRef } from "react";

export default function TradingViewChart({ symbol = "OANDA:EURUSD", interval = "60" }) {
  const container = useRef(null);
  useEffect(() => {
    const node = container.current;
    if (!node) return;
    node.innerHTML = '<div class="tradingview-widget-container__widget" style="height:calc(100% - 28px);width:100%"></div><div class="tradingview-widget-copyright" style="height:28px;display:flex;align-items:center;justify-content:center;font-size:11px;color:#6B7280"><a href="https://www.tradingview.com/" rel="noopener nofollow" target="_blank" style="color:#8B9DC3">Graphique</a>&nbsp;par TradingView</div>';
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;
    script.innerHTML = JSON.stringify({ autosize:true, symbol, interval, timezone:"Europe/Paris", theme:"dark", style:"1", locale:"fr", backgroundColor:"#131722", gridColor:"rgba(255,255,255,0.04)", allow_symbol_change:true, hide_side_toolbar:false, hide_top_toolbar:false, hide_legend:false, hide_volume:false, save_image:true, calendar:false, withdateranges:true, support_host:"https://www.tradingview.com" });
    node.appendChild(script);
    return () => { node.innerHTML = ""; };
  }, [symbol, interval]);
  return <div ref={container} className="tradingview-widget-container h-full w-full" />;
}
