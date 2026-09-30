import React from "react";
import { AlertCircle, BarChart3, BrainCircuit, CalendarDays, Check, CheckCircle2, ClipboardCheck, FileQuestion, Loader2, ShieldAlert, Sparkles } from "lucide-react";
import { actionPlanProgress, briefingPresentation, measuredValue } from "@/lib/atlasBriefing";

const severityStyle = {
  critical: { color: "#F26A70", border: "rgba(242,106,112,.22)", background: "rgba(242,106,112,.055)" },
  warning: { color: "#FFB855", border: "rgba(255,184,85,.22)", background: "rgba(255,184,85,.055)" },
  info: { color: "#7CA7FF", border: "rgba(124,167,255,.20)", background: "rgba(124,167,255,.05)" },
};

const money = (value) => value === null || value === undefined
  ? "Non mesuré"
  : new Intl.NumberFormat("fr-FR", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);

export default function AtlasCoachingHub({
  briefing,
  loading,
  period,
  onPeriodChange,
  onAnalyze,
  analysisLoading,
  actionState = {},
  onToggleAction,
  savingAction,
}) {
  if (loading && !briefing) return <section className="pe-card pe-card-pad min-h-80 animate-pulse" aria-label="Chargement du pilotage Atlas"/>;
  if (!briefing) return null;

  const presentation = briefingPresentation(briefing.alerts);
  const progress = actionPlanProgress(briefing.action_plan, actionState);
  const overview = briefing.overview || {};
  const analyzeLabel = period === "daily" ? "Générer le bilan IA du jour" : "Générer la revue IA de la semaine";

  return <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0B0E18]">
    <header className="flex flex-col gap-4 border-b border-white/[0.07] p-5 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#4F8CFF]/12 text-[#7CA7FF]"><BarChart3 className="h-5 w-5"/></span><div><div className="pe-eyebrow">ATLAS · PILOTAGE CONTINU</div><h2 className="mt-1 text-lg font-semibold">Bilan, alertes et plan d’action</h2><p className="mt-1 max-w-2xl text-xs leading-5 text-[#7E8798]">Le moteur mesure les faits. L’IA les explique ensuite sans modifier les règles ni produire de signal.</p></div></div>
      <div className="flex flex-wrap items-center gap-2"><div className="flex rounded-xl border border-white/[0.08] bg-[#070A12] p-1">{[["daily","Aujourd’hui"],["weekly","7 jours"]].map(([value,label])=><button key={value} type="button" onClick={()=>onPeriodChange(value)} aria-pressed={period===value} className={`rounded-lg px-3 py-2 text-xs transition ${period===value?"bg-[#7C4DFF] text-white":"text-[#7E8798] hover:text-white"}`}>{label}</button>)}</div><span className="rounded-full border px-3 py-2 text-[10px] font-semibold" style={{color:presentation.color,borderColor:`${presentation.color}44`,background:presentation.background}}>{presentation.label}</span></div>
    </header>

    <div className="space-y-5 p-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="Trades" value={overview.trade_count ?? 0} icon={CalendarDays}/>
        <Metric label="P&L mesuré" value={money(overview.measured_pnl)} icon={BarChart3}/>
        <Metric label="Win rate" value={measuredValue(overview.win_rate_percent, "%")} icon={CheckCircle2}/>
        <Metric label="Respect du plan" value={measuredValue(overview.plan_respect_percent, "%")} icon={ShieldAlert}/>
        <Metric label="Checklist" value={measuredValue(overview.checklist_completion_percent, "%")} icon={ClipboardCheck}/>
      </div>

      <div className="grid gap-5 xl:grid-cols-[.95fr_1.05fr]">
        <div className="rounded-2xl border border-white/[0.07] bg-[#070A12] p-4">
          <div className="flex items-center justify-between gap-3"><div><div className="text-sm font-semibold">Alertes automatiques</div><p className="mt-1 text-[11px] text-[#697183]">Calculées dès l’ouverture à partir des données disponibles.</p></div><span className="font-numeric rounded-lg bg-white/[0.04] px-2.5 py-1 text-xs text-[#AAB1BE]">{briefing.alerts.length}</span></div>
          <div className="mt-4 space-y-2">{briefing.alerts.length?briefing.alerts.map((alert)=>{const tone=severityStyle[alert.severity]||severityStyle.info;return <article key={alert.id} className="rounded-xl border p-3" style={{borderColor:tone.border,background:tone.background}}><div className="flex items-start gap-3"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" style={{color:tone.color}}/><div><h3 className="text-xs font-semibold" style={{color:tone.color}}>{alert.title}</h3><p className="mt-1 text-[11px] leading-5 text-[#8B93A3]">{alert.detail}</p><div className="mt-2 text-[9px] uppercase tracking-[.12em] text-[#596172]">Source · {alert.source}</div></div></div></article>}):<div className="rounded-xl border border-[#46C99A]/15 bg-[#46C99A]/[0.04] p-4 text-xs text-[#72DDB6]">Aucune alerte mesurée sur cette période.</div>}</div>
        </div>

        <div className="rounded-2xl border border-white/[0.07] bg-[#070A12] p-4">
          <div className="flex items-center justify-between gap-4"><div><div className="text-sm font-semibold">Plan d’action suivi</div><p className="mt-1 text-[11px] text-[#697183]">Une priorité à la fois, avec un critère de réussite explicite.</p></div><div className="text-right"><div className="font-numeric text-sm font-bold text-[#B58BFF]">{progress.completed}/{progress.total}</div><div className="text-[9px] text-[#596172]">{progress.percent}% terminé</div></div></div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.06]"><div className="h-full rounded-full bg-gradient-to-r from-[#7C4DFF] to-[#4F8CFF] transition-all" style={{width:`${progress.percent}%`}}/></div>
          <div className="mt-4 space-y-2">{briefing.action_plan.map((action)=>{const done=Boolean(actionState[action.id]);return <button key={action.id} type="button" onClick={()=>onToggleAction(action.id)} disabled={savingAction===action.id} aria-pressed={done} className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${done?"border-[#46C99A]/20 bg-[#46C99A]/[0.05]":"border-white/[0.07] bg-white/[0.018] hover:border-[#7C4DFF]/30"}`}><span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border ${done?"border-[#46C99A] bg-[#46C99A] text-[#06130C]":"border-white/15 text-transparent"}`}>{savingAction===action.id?<Loader2 className="h-3 w-3 animate-spin text-white"/>:<Check className="h-3 w-3"/>}</span><span className="min-w-0 flex-1"><span className={`block text-xs font-semibold ${done?"text-[#72DDB6]":"text-white"}`}>{action.priority}. {action.title}</span><span className="mt-1 block text-[11px] leading-4 text-[#7E8798]">{action.description}</span><span className="mt-2 block text-[10px] leading-4 text-[#A58EDB]">Mesure : {action.success_measure}</span></span></button>})}</div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_auto] xl:items-end">
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.015] p-4"><div className="flex items-center gap-2 text-sm font-semibold"><FileQuestion className="h-4 w-4 text-[#B58BFF]"/>Revues post-trade à compléter</div>{briefing.review_queue.length?<div className="mt-3 grid gap-2 md:grid-cols-2">{briefing.review_queue.map((trade)=><article key={trade.trade_id} className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-[#070A12] p-3"><div className="min-w-0"><div className="text-xs font-semibold">{trade.instrument||"Instrument"} · {trade.date}</div><div className="mt-1 truncate text-[10px] text-[#697183]">À compléter : {trade.missing.join(", ")}</div></div><button type="button" onClick={()=>onAnalyze({tradeId:trade.trade_id})} disabled={analysisLoading} className="shrink-0 rounded-lg border border-[#7C4DFF]/30 px-3 py-2 text-[10px] font-semibold text-[#C8AEFF] hover:bg-[#7C4DFF]/10 disabled:opacity-50">Revue IA</button></article>)}</div>:<p className="mt-3 text-xs text-[#72DDB6]">Les trades de la période sont suffisamment documentés.</p>}</div>
        <button type="button" onClick={()=>onAnalyze({period})} disabled={analysisLoading||!overview.trade_count} className="btn-primary inline-flex min-h-12 w-full items-center justify-center gap-2 disabled:opacity-50 xl:w-auto">{analysisLoading?<Loader2 className="h-4 w-4 animate-spin"/>:<Sparkles className="h-4 w-4"/>}{analysisLoading?"Atlas analyse…":analyzeLabel}</button>
      </div>

      <details className="rounded-xl border border-white/[0.06] bg-white/[0.012] p-4"><summary className="cursor-pointer text-xs font-semibold text-[#8E97A8]">Comment Atlas a calculé ce bilan</summary><div className="mt-3 grid gap-3 text-[10px] leading-5 text-[#697183] sm:grid-cols-2"><p>{briefing.explainability.notice}</p><p>Moteur : {briefing.explainability.engine}. Données P&L disponibles : {briefing.explainability.data_quality.trades_with_pnl}/{briefing.explainability.data_quality.total_trades}. Les valeurs absentes restent non mesurées.</p></div></details>
    </div>
  </section>;
}

function Metric({label,value,icon:Icon}) {
  return <div className="rounded-xl border border-white/[0.07] bg-white/[0.018] p-3"><div className="flex items-center gap-2 text-[10px] uppercase tracking-[.1em] text-[#697183]"><Icon className="h-3.5 w-3.5 text-[#7C4DFF]"/>{label}</div><div className="font-numeric mt-2 text-lg font-bold text-white">{value}</div></div>;
}
