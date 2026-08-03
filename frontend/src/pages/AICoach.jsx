import React, { useEffect, useState } from "react";
import { coach, dashboard } from "@/lib/api";
import { toast } from "sonner";
import { Sparkles, Send, Brain, AlertTriangle, Target, Clock, Shield, Trophy } from "lucide-react";
import { useAppSettings } from "@/hooks/useAppSettings";
import { useI18n } from "@/context/I18nContext";
import { useAuth } from "@/context/AuthContext";
import { canUseFeature } from "@/config/billing";
import { FeatureGate } from "@/components/FeatureGate";

const PRESETS = [
  { fr:"Analyse mon mois", en:"Analyze my month" },
  { fr:"Trouve mes erreurs", en:"Find my mistakes" },
  { fr:"Pourquoi je perds ?", en:"Why am I losing?" },
  { fr:"Quel est mon meilleur setup ?", en:"What is my best setup?" },
  { fr:"Comment améliorer ma discipline ?", en:"How can I improve my discipline?" },
  { fr:"Quel est mon coût d'overtrading ?", en:"What is the cost of my overtrading?" },
];

export default function AICoach() {
  const { date } = useAppSettings();
  const { language } = useI18n();
  const { user } = useAuth();
  const hasCoachAccess = canUseFeature(user, "aiCoach");
  const [q, setQ] = useState("");
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    if (!hasCoachAccess) { setInitialLoading(false); return; }
    Promise.all([coach.history(),dashboard()]).then(([h,d])=>{setHistory(h.data);setSummary(d.data)}).catch(()=>toast.error("Impossible de charger l’analyse")).finally(()=>setInitialLoading(false));
  }, [hasCoachAccess]);
  const planRate = summary?.metrics?.plan_respect_rate;
  const insights = summary?.kpis?.total_trades ? [
    { I: AlertTriangle, t: "Respect du plan", d: planRate === null || planRate === undefined ? "Pas encore mesuré" : `${planRate}% des trades renseignés respectent le plan`, c: planRate === null || planRate === undefined ? "#7E8798" : planRate>=80?"#00E676":"#FFB855" },
    { I: Trophy, t: "Meilleur setup", d: summary.best_setup || "Pas encore déterminé", c: "#00E676" },
    { I: Clock, t: "Setup à surveiller", d: summary.worst_setup || "Pas encore déterminé", c: "#FF5252" },
    { I: Shield, t: "Score discipline", d: `${summary.kpis.discipline_score}/100`, c: "#FFB855" },
    { I: Target, t: "Trades analysés", d: `${summary.kpis.total_trades} trades réels`, c: "#B58BFF" },
  ] : [];

  const ask = async (text) => {
    const question = text || q;
    if (!question.trim()) return;
    setLoading(true);
    try {
      const { data } = await coach.ask(question);
      setHistory(h => [data, ...h]);
      setQ(""); toast.success("Analyse prête");
    } catch (e) { toast.error(e.response?.data?.detail || "Coach indisponible"); }
    finally { setLoading(false); }
  };

  return (
    <div className="pe-page pe-page-stack mx-auto max-w-[1800px]">
      <div className="pe-page-header justify-start">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-pe-md bg-gradient-to-br from-[#7C4DFF] to-[#4F8CFF] glow-purple"><Brain className="w-5 h-5"/></div>
        <div>
          <div className="pe-eyebrow">Coach comportemental</div>
          <h1 className="pe-page-title">Analyse IA</h1>
          <p className="pe-page-copy">Discute avec Atlas, ton coach d’analyse comportementale. Aucun signal de trading.</p>
        </div>
      </div>

      {!hasCoachAccess ? <FeatureGate feature="aiCoach" label="le coach IA complet" className="block w-full"><div className="pe-card pe-card-pad glow-purple"><div className="flex items-center gap-3"><Sparkles className="h-5 w-5 text-[#B58BFF]"/><div><div className="font-semibold">Atlas est en préparation</div><p className="mt-1 text-xs text-[#9CA3AF]">Aperçu de la future analyse comportementale, sans signal de trading.</p></div></div></div></FeatureGate> : <div className="pe-card pe-card-pad glow-purple">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Pose ta question à Atlas…" data-testid="coach-input" className="pe-control min-w-0 flex-1" onKeyDown={(e)=>e.key==="Enter"&&ask()} />
          <button onClick={()=>ask()} disabled={loading} className="btn-primary inline-flex items-center gap-2 text-sm" data-testid="coach-ask"><Send className="w-4 h-4"/>{loading?"…":"Envoyer"}</button>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          {PRESETS.map(p => { const label=p[language] || p.fr; return <button key={p.fr} onClick={()=>ask(label)} disabled={loading} data-testid={`coach-preset-${p.fr.slice(0,8)}`} className="pe-badge min-h-8 hover:border-[#7C4DFF]/40 hover:text-white">{label}</button> })}
        </div>
      </div>}

      {hasCoachAccess && (initialLoading ? <div className="grid md:grid-cols-5 gap-3">{Array.from({length:5}).map((_,i)=><div key={i} className="h-28 card-flat animate-pulse"/>)}</div> : insights.length ? <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-3">
        {insights.map(i => (
          <div key={i.t} className="pe-card p-4">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: `${i.c}22` }}><i.I className="w-4 h-4" style={{ color: i.c }}/></div>
            <div className="text-sm font-semibold">{i.t}</div>
            <div className="mt-1 text-xs leading-relaxed text-[#9CA3AF]">{i.d}</div>
          </div>
        ))}
      </div> : <div className="rounded-2xl border border-dashed border-white/10 p-5 text-center text-xs text-[#7E8798]">Les cartes d’insight apparaîtront après l’ajout de tes premiers trades.</div>)}

      {hasCoachAccess && <div className="space-y-3">
        {history.length === 0 && !loading && (
          <div className="pe-empty-state">
            <Sparkles className="w-8 h-8 mx-auto text-[#B58BFF] mb-3"/>
            <div className="text-sm text-[#9CA3AF]">Pose une question pour démarrer ton analyse comportementale.</div>
          </div>
        )}
        {history.map(r => (
          <div key={r.id} className="pe-card pe-card-pad" data-testid={`coach-report-${r.id}`}>
            <div className="pe-eyebrow mb-2">{r.tag} · {date(r.created_at,{withTime:true})}</div>
            <div className="font-semibold mb-3">{r.question}</div>
            <div className="text-sm text-[#B5BBC9] whitespace-pre-wrap leading-relaxed">{r.answer}</div>
            {r.evidence?.length>0&&<details className="mt-5 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4"><summary className="cursor-pointer text-xs font-semibold text-[#B58BFF]">Sources utilisées · {r.evidence.length} trade{r.evidence.length>1?"s":""}</summary><div className="mt-3 grid gap-2 sm:grid-cols-2">{r.evidence.map(source=><div key={`${source.alias}-${source.trade_id}`} className="rounded-lg border border-white/[0.06] bg-[#0A0D17] p-3 text-xs"><div className="flex items-center justify-between gap-3"><span className="font-mono font-bold text-[#B58BFF]">[{source.alias}]</span><span className={Number(source.pnl)>=0?"text-[#00E676]":"text-[#FF6B76]"}>{source.pnl===null||source.pnl===undefined?"P&L non renseigné":`${Number(source.pnl)>=0?"+":""}${Number(source.pnl).toFixed(2)}`}</span></div><div className="mt-1 font-semibold">{source.instrument||"Instrument non renseigné"} · {source.direction||"—"}</div><div className="mt-1 text-[#7E8798]">{source.date||"Date inconnue"}{source.setup?` · ${source.setup}`:""}{source.session?` · ${source.session}`:""}</div></div>)}</div></details>}
          </div>
        ))}
      </div>}
    </div>
  );
}
