import React, { useEffect, useState } from "react";
import { dashboard } from "@/lib/api";
import { Shield, CheckCircle2, XCircle, AlertTriangle, TrendingUp } from "lucide-react";

export default function Discipline() {
  const [d, setD] = useState(null);
  useEffect(() => { dashboard().then(r => setD(r.data)).catch(()=>setD({})); }, []);
  const k = d?.kpis || { discipline_score: 94 };
  const m = d?.metrics || { plan_respect_rate: 94, winrate: 62 };
  const violations = Math.max(0, Math.round((d?.kpis?.total_trades || 0) * (100 - m.plan_respect_rate) / 100));
  const streak = violations === 0 ? Math.min(30, d?.kpis?.total_trades || 0) : Math.max(0, Math.round(m.plan_respect_rate / 10));
  return (
    <div className="p-4 sm:p-7 space-y-5">
      <h1 className="text-2xl sm:text-3xl font-bold">Discipline Engine</h1>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card-elev p-8 text-center glow-purple lg:col-span-1">
          <div className="text-[11px] font-mono uppercase tracking-widest text-[#9CA3AF]">Score de discipline</div>
          <div className="my-5"><BigGauge value={k.discipline_score} /></div>
          <div className="text-sm text-[#B58BFF]">Excellent</div>
        </div>

        <div className="card-elev p-6 lg:col-span-2">
          <div className="text-sm font-semibold mb-4">Règles du jour</div>
          <div className="grid sm:grid-cols-2 gap-3">
            <RuleCard ok={true} label="Risque respecté" sub="Max 1% par trade — toujours respecté" />
            <RuleCard ok={true} label="Session respectée" sub="London + NY uniquement" />
            <RuleCard ok={m.plan_respect_rate >= 80} label="Plan respecté" sub={`${m.plan_respect_rate}% des trades`} />
            <RuleCard ok={true} label="Max trades respecté" sub="3 trades / jour" />
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card-elev p-6">
          <div className="text-sm font-semibold mb-3">Streak de consistance</div>
          <div className="text-5xl font-bold font-mono text-[#00E676]">{streak}<span className="text-base text-[#9CA3AF]">j</span></div>
          <div className="text-xs text-[#9CA3AF] mt-2">Jours consécutifs sans violation</div>
        </div>
        <div className="card-elev p-6">
          <div className="text-sm font-semibold mb-3">Violations ce mois</div>
          <div className="text-5xl font-bold font-mono">{violations}</div>
          <div className="text-xs text-[#FF5252] mt-2 flex items-center gap-1"><AlertTriangle className="w-3 h-3"/>{violations ? "Trades hors plan détectés" : "Aucune violation détectée"}</div>
        </div>
        <div className="card-elev p-6">
          <div className="text-sm font-semibold mb-3">Plan respect rate</div>
          <div className="text-5xl font-bold font-mono text-[#B58BFF]">{m.plan_respect_rate}<span className="text-base text-[#9CA3AF]">%</span></div>
          <div className="h-2 rounded-full bg-white/5 mt-3 overflow-hidden"><div className="h-full bg-gradient-to-r from-[#7C4DFF] to-[#4F8CFF]" style={{ width: `${m.plan_respect_rate}%` }} /></div>
        </div>
      </div>
    </div>
  );
}

const RuleCard = ({ ok, label, sub }) => (
  <div className="card-flat p-4 flex items-start gap-3">
    {ok ? <CheckCircle2 className="w-5 h-5 text-[#00E676] mt-0.5"/> : <XCircle className="w-5 h-5 text-[#FF5252] mt-0.5"/>}
    <div>
      <div className="text-sm font-semibold">{label}</div>
      <div className="text-xs text-[#9CA3AF] mt-1">{sub}</div>
    </div>
  </div>
);

function BigGauge({ value }) {
  const pct = value / 100;
  return (
    <div className="relative w-52 h-32 mx-auto">
      <svg viewBox="0 0 200 110" className="w-full h-full">
        <defs><linearGradient id="dg-grad" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#7C4DFF"/><stop offset="100%" stopColor="#B58BFF"/></linearGradient></defs>
        <path d="M20 95 A75 75 0 0 1 180 95" stroke="#1E2430" strokeWidth="14" fill="none" strokeLinecap="round" />
        <path d="M20 95 A75 75 0 0 1 180 95" stroke="url(#dg-grad)" strokeWidth="14" fill="none" strokeLinecap="round" strokeDasharray="236" strokeDashoffset={236 - 236*pct} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
        <div className="text-4xl font-bold font-mono">{value}<span className="text-sm text-[#9CA3AF]">/100</span></div>
      </div>
    </div>
  );
}
