import React, { useEffect, useState } from "react";
import { dashboard } from "@/lib/api";
import { Shield, CheckCircle2, XCircle } from "lucide-react";

export default function Discipline() {
  const [d, setD] = useState(null);
  useEffect(() => { dashboard().then(r => setD(r.data)); }, []);
  if (!d) return <div className="p-10 text-[#9CA3AF]">Loading…</div>;
  const score = d.kpis.discipline_score;
  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gradient">Discipline Center</h1>
        <p className="text-[#9CA3AF] text-sm mt-1">The only score that protects your account.</p>
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card-elev p-10 text-center glow-green" data-testid="discipline-score-card">
          <Shield className="w-10 h-10 mx-auto text-[#00E676] mb-4" />
          <div className="text-7xl font-bold font-mono" style={{ color: score >= 70 ? "#00E676" : score >= 50 ? "#4F8CFF" : "#FF5252" }}>{score}<span className="text-2xl text-[#9CA3AF]">/100</span></div>
          <div className="text-xs font-mono uppercase text-[#9CA3AF] mt-2">Live Discipline Score</div>
        </div>
        <div className="card-elev p-6">
          <div className="text-xs font-mono uppercase text-[#9CA3AF] mb-4">Daily Checklist</div>
          <div className="space-y-3">
            <Item ok={d.metrics.plan_respect_rate >= 80} label="Plan Respected" />
            <Item ok={d.kpis.trader_score >= 60} label="Trader Score Healthy" />
            <Item ok={d.metrics.winrate >= 40} label="Winrate Stable" />
            <Item ok={d.kpis.survival_score >= 70} label="Survival Probability OK" />
          </div>
        </div>
      </div>
      <div className="card-elev p-6">
        <div className="text-xs font-mono uppercase text-[#9CA3AF] mb-4">Plan Respect Rate</div>
        <div className="h-3 rounded-full bg-white/5 overflow-hidden"><div className="h-full bg-gradient-to-r from-[#4F8CFF] to-[#7C4DFF]" style={{ width: `${d.metrics.plan_respect_rate}%` }} /></div>
        <div className="text-sm font-mono mt-2">{d.metrics.plan_respect_rate}%</div>
      </div>
    </div>
  );
}

const Item = ({ ok, label }) => (
  <div className="flex items-center gap-3">{ok ? <CheckCircle2 className="w-5 h-5 text-[#00E676]"/> : <XCircle className="w-5 h-5 text-[#FF5252]"/>}<span className="text-sm">{label}</span></div>
);
