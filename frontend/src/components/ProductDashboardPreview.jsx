import React from "react";
import { BarChart3, Shield, TrendingUp, ArrowDownRight } from "lucide-react";
import { LogoMark } from "@/components/Logo";
import { DashboardEquityCard, DashboardKpiCard } from "@/components/dashboard/DashboardVisuals";

const DEMO_EQUITY = [
  { date: "7 mai", equity: 250000 }, { date: "10 mai", equity: 251100 },
  { date: "14 mai", equity: 254500 }, { date: "17 mai", equity: 253400 },
  { date: "21 mai", equity: 257900 }, { date: "24 mai", equity: 256800 },
  { date: "28 mai", equity: 261700 }, { date: "31 mai", equity: 260900 },
  { date: "4 juin", equity: 264450 },
];

const NAVIGATION = ["Vue d’ensemble", "Comptes", "Journal", "Marchés", "Backtest", "Statistiques", "Analyse IA", "Discipline", "Payouts", "Rapports", "Paramètres"];
const money = (value) => `${Math.round(value / 1000)} k$`;

function PreviewSidebar() {
  return <aside className="w-[176px] shrink-0 border-r border-white/[0.06] bg-[#050609] p-4">
    <div className="mb-5 flex h-9 items-center gap-2"><LogoMark size="sm" className="!h-7 !w-7" /><span className="text-sm font-semibold">PipsEvo<span className="text-[#7C4DFF]">.</span></span></div>
    <div className="space-y-1">{NAVIGATION.map((label, index) => <div key={label} className={`rounded-xl border px-3 py-2 text-[10px] ${index === 0 ? "border-[#7C4DFF]/35 bg-[#7C4DFF]/20 text-white" : "border-transparent text-[#8B93A3]"}`}>{label}</div>)}</div>
    <div className="mt-4 rounded-2xl border border-white/[0.07] bg-[#0B0D16] p-3 text-center"><div className="text-[8px] uppercase tracking-[.16em] text-[#687181]">Discipline du jour</div><div className="mt-2 font-numeric text-2xl font-bold text-[#B58BFF]">92<span className="text-[10px] text-[#687181]">/100</span></div><div className="mt-1 text-[9px] text-[#00E676]">Excellent</div></div>
  </aside>;
}

function RecentTrades() {
  return <div className="card-elev h-full p-4"><div className="mb-3 text-[12px] font-semibold">Trades récents</div>{[["EURUSD", "+1,32 R"], ["NAS100", "-0,45 R"], ["XAUUSD", "+2,11 R"], ["GBPUSD", "+1,05 R"]].map(([instrument, result], index) => <div key={instrument} className="flex items-center justify-between border-t border-white/[0.05] py-2 text-[10px]"><span className="font-medium text-[#C9CDD6]">{instrument}</span><span className="font-numeric" style={{ color: index === 1 ? "#FF5252" : "#00E676" }}>{result}</span></div>)}</div>;
}

function RiskCard() {
  return <div className="card-elev h-full p-4"><div className="text-[12px] font-semibold">Gestion du risque</div><div className="mt-3 space-y-2">{[["Régularité", 94], ["Contrôle émotionnel", 92], ["Gestion du risque", 95], ["Patience", 93]].map(([label, value]) => <div key={label} className="flex items-center justify-between text-[9px]"><span className="text-[#8B93A3]">{label}</span><span className="font-numeric text-white">{value}</span></div>)}</div><div className="mt-3 text-[9px] text-[#B58BFF]">Voir le détail →</div></div>;
}

function ProductCanvas({ mobile = false }) {
  return <div className="flex h-[650px] w-[1180px] overflow-hidden rounded-[28px] border border-white/[0.1] bg-[#070910] shadow-[0_55px_130px_-42px_rgba(124,77,255,.72)]">
    {!mobile && <PreviewSidebar />}
    <main className="min-w-0 flex-1 p-5">
      <div className="mb-4 flex items-center justify-between"><div><div className="text-[22px] font-bold">Vue d’ensemble</div><div className="mt-1 text-[10px] text-[#6B7280]">Données de démonstration</div></div><div className="rounded-xl border border-white/[0.07] bg-[#0D1020] px-4 py-2 text-[11px] text-[#9CA3AF]">30 derniers jours</div></div>
      <div className="grid grid-cols-4 gap-3">
        <DashboardKpiCard preview label="Profit net" value="+8 240 $US" sub="30 derniers jours" sparkColor="green" icon={TrendingUp} />
        <DashboardKpiCard preview label="Score de discipline" value="92 /100" sub="Excellent" sparkColor="purple" icon={BarChart3} />
        <DashboardKpiCard preview label="Comptes actifs" value="5" sub="Tous suivis" sparkColor="blue" icon={Shield} />
        <DashboardKpiCard preview label="Drawdown restant" value="4 760 $US" sub="Marge disponible" sparkColor="red" icon={ArrowDownRight} />
      </div>
      <div className="mt-3 grid grid-cols-[1.9fr_.78fr] gap-3"><DashboardEquityCard preview data={DEMO_EQUITY} money={money} /><div className="grid gap-3"><div className="card-elev p-4"><div className="text-[12px] font-semibold">Progression payout</div><div className="mt-3 font-numeric text-[22px] font-bold">12 450 $US <span className="text-[10px] font-normal text-[#7E8798]">/ 15 000 $US</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-white/5"><div className="h-full w-[83%] rounded-full bg-gradient-to-r from-[#7C4DFF] to-[#4F8CFF]" /></div><div className="mt-2 text-right text-[9px] text-[#9CA3AF]">83 %</div></div><div className="card-elev p-4"><div className="text-[12px] font-semibold text-[#B58BFF]">✦ Conseil Atlas</div><p className="mt-2 text-[9px] leading-relaxed text-[#B5BBC9]">Ton plan est respecté sur 87 % des trades. Maintiens cette discipline pendant les sessions volatiles.</p></div></div></div>
      <div className="mt-3 grid grid-cols-[1fr_1fr_.8fr] gap-3"><RecentTrades /><div className="card-elev p-4"><div className="text-[12px] font-semibold">Répartition des trades</div><div className="mt-5 flex items-center justify-center gap-5"><div className="h-24 w-24 rounded-full border-[15px] border-[#00C997] border-r-[#FF5252] border-b-[#4F8CFF]" /><div className="space-y-2 text-[9px]"><div><span className="text-[#00E676]">●</span> Gagnants&nbsp; 72 %</div><div><span className="text-[#FF5252]">●</span> Perdants&nbsp; 28 %</div><div className="text-[#8B93A3]">Total&nbsp; 186</div></div></div></div><RiskCard /></div>
    </main>
  </div>;
}

export default function ProductDashboardPreview({ variant = "hero", tilted = false, className = "" }) {
  const isCompact = variant === "compact";
  const isMobile = variant === "mobile";
  return <div className={`relative w-full overflow-hidden ${isCompact ? "aspect-[16/9]" : isMobile ? "aspect-[4/3]" : "aspect-[1.68/1]"} ${className}`} style={{ perspective: "1800px" }} role="img" aria-label="Aperçu du vrai tableau de bord PipsEvo en français">
    <div className="absolute left-0 top-0 origin-top-left" style={{ width: 1180, height: 650, transform: `${tilted ? "rotateY(-7deg) rotateX(2deg) " : ""}scale(var(--preview-scale, 1))`, transformStyle: "preserve-3d" }}><ProductCanvas mobile={isMobile} /></div>
    <style>{`.relative[role="img"]{--preview-scale:min(calc(100cqw / 1180),calc(100cqh / 650));container-type:size}`}</style>
  </div>;
}
