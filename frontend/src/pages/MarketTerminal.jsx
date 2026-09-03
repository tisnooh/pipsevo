import React, { useEffect, useMemo, useState } from "react";
import { BarChart3, CheckCircle2, ExternalLink, ShieldCheck } from "lucide-react";
import TradingViewChart from "@/components/TradingViewChart";
import PositionCalculator from "@/components/PositionCalculator";
import { useAuth } from "@/context/AuthContext";
import { normalizeTradingRules } from "@/components/TradingRulesEditor";
import { normalizePreTradeChecks, readPreTradeChecks, writePreTradeChecks } from "@/lib/preTradeChecklist";

const MARKET_GROUPS = {
  cfd: [
    { id: "eurusd", label: "EUR/USD", symbol: "OANDA:EURUSD" },
    { id: "gold-cfd", label: "Or CFD", symbol: "OANDA:XAUUSD" },
    { id: "nasdaq-cfd", label: "Nasdaq CFD", symbol: "NASDAQ:NDX" },
    { id: "bitcoin-cfd", label: "Bitcoin CFD", symbol: "BINANCE:BTCUSDT" },
  ],
  futures: [
    { id: "nasdaq-futures", label: "Nasdaq Futures", symbol: "NASDAQ:NDX", directSymbol: "CME_MINI:NQ1!", proxyLabel: "Indice Nasdaq" },
    { id: "sp-futures", label: "S&P Futures", symbol: "SP:SPX", directSymbol: "CME_MINI:ES1!", proxyLabel: "Indice S&P 500" },
    { id: "gold-futures", label: "Or Futures", symbol: "OANDA:XAUUSD", directSymbol: "COMEX:GC1!", proxyLabel: "Or spot" },
    { id: "oil-futures", label: "Pétrole Futures", symbol: "TVC:USOIL", directSymbol: "NYMEX:CL1!", proxyLabel: "Pétrole US" },
  ],
};
export default function MarketTerminal(){
  const {user}=useAuth(); const markets=useMemo(()=>user?.trader_type==="both"?[...MARKET_GROUPS.futures,...MARKET_GROUPS.cfd]:MARKET_GROUPS[user?.trader_type]||MARKET_GROUPS.futures,[user?.trader_type]);
  const checklist=useMemo(()=>normalizeTradingRules(user?.rules).pre_trade_checklist.filter(item=>item.enabled!==false),[user?.rules]);
  const [market,setMarket]=useState(markets[0]); const [interval,setInterval]=useState("60");
  const [checks,setChecks]=useState(()=>readPreTradeChecks(checklist));
  useEffect(()=>{if(!markets.some(m=>m.id===market.id))setMarket(markets[0])},[markets,market.id]);
  useEffect(()=>{setChecks(current=>normalizePreTradeChecks(current,checklist))},[checklist]);
  useEffect(()=>{writePreTradeChecks(checks,checklist)},[checks,checklist]);
  const toggle=id=>setChecks(current=>({...current,[id]:!current[id]}));
  const checkedCount=checklist.filter(item=>Boolean(checks[item.id])).length;
  return <div className="pe-page pe-page-stack mx-auto max-w-[1800px]">
    <div className="pe-page-header"><div><div className="pe-eyebrow">Contexte de marché</div><h1 className="pe-page-title mt-2 flex items-center gap-2"><BarChart3 className="h-6 w-6 text-[#B58BFF]"/>Marchés</h1><p className="pe-page-copy mt-1">Analyse le contexte, calcule ton risque, puis documente ta décision.</p></div><a href={`https://www.tradingview.com/chart/?symbol=${encodeURIComponent(market.directSymbol || market.symbol)}`} target="_blank" rel="noreferrer" className="btn-ghost inline-flex items-center gap-2 text-sm">Ouvrir TradingView <ExternalLink className="w-4 h-4"/></a></div>
    <div className="pe-card p-3 sm:p-5"><div className="mb-4 flex flex-col justify-between gap-3 lg:flex-row"><div className="flex gap-2 overflow-x-auto pb-1">{markets.map(x=><button key={x.id} onClick={()=>setMarket(x)} className={`min-h-10 whitespace-nowrap rounded-xl border px-3 text-xs font-medium transition-colors ${market.id===x.id?"border-[#7C4DFF]/50 bg-[#7C4DFF]/20 text-white":"border-white/5 text-[#9CA3AF] hover:border-white/15 hover:text-white"}`}>{x.label}</button>)}</div><div className="flex gap-1">{[["15","15m"],["60","1h"],["240","4h"],["D","1j"]].map(([v,l])=><button key={v} onClick={()=>setInterval(v)} className={`min-h-10 min-w-10 rounded-lg px-3 text-xs font-medium transition-colors ${interval===v?"bg-white/10 text-white":"text-[#6B7280] hover:text-white"}`}>{l}</button>)}</div></div><div className="h-[430px] overflow-hidden rounded-pe-md border border-white/10 bg-[#131722] sm:h-[620px]"><TradingViewChart symbol={market.symbol} interval={interval}/></div>{market.proxyLabel&&<p className="mt-3 text-xs text-[#7F8799]">Aperçu intégré via {market.proxyLabel}. Le bouton « Ouvrir TradingView » affiche le contrat futures exact.</p>}</div>
    <div className="grid lg:grid-cols-2 gap-4">
      <PositionCalculator defaultMode={user?.trader_type === "futures" ? "futures" : "cfd"}/>
      <div className="pe-card pe-card-pad"><div className="pe-section-title flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-[#46C99A]"/>Check-list avant trade</div><div className="mt-5 space-y-3">{checklist.map(item=><button type="button" key={item.id} aria-pressed={Boolean(checks[item.id])} onClick={()=>toggle(item.id)} className={`flex min-h-11 w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors ${checks[item.id]?"border-[#46C99A]/40 bg-[#46C99A]/5":"border-white/5 bg-white/[0.02] hover:border-white/15"}`}><CheckCircle2 className={`w-5 h-5 shrink-0 ${checks[item.id]?"text-[#46C99A]":"text-[#374151]"}`}/><span className="text-sm">{item.label}</span></button>)}</div><div className="mt-5 h-2 overflow-hidden rounded-full bg-white/5"><div className="h-full bg-[#46C99A] transition-all" style={{width:`${checklist.length?checkedCount/checklist.length*100:0}%`}}/></div><div className="mt-2 flex items-baseline gap-1.5 font-sans text-sm font-medium tabular-nums text-[#B5BBC9]" aria-live="polite"><span className="text-white">{checkedCount}</span><span>conditions validées sur</span><span className="text-white">{checklist.length}</span></div></div>
    </div>
    <p className="text-xs leading-relaxed text-[#6B7280]">Les graphiques sont fournis par TradingView. PipsEvo ne fournit aucun signal, conseil financier ou recommandation d'investissement.</p>
  </div>;
}
