import React, { useMemo, useState } from "react";
import { AlertTriangle, BrainCircuit, Check, CheckCircle2, Loader2, ShieldAlert, XCircle } from "lucide-react";
import { toast } from "sonner";
import { coach } from "@/lib/api";
import { buildReadinessPayload, createReadinessForm, readinessPresentation } from "@/lib/atlasReadiness";
import { DEFAULT_CHECKLIST } from "@/lib/journalPreferences";
import { localDateKey } from "@/lib/tradeCalendar";

const control = "w-full rounded-xl border border-white/[0.09] bg-[#090D19] px-3.5 py-3 text-sm text-white outline-none transition placeholder:text-[#4F5869] focus:border-[#7C4DFF]/70";
const emotions = ["Calme", "Concentré", "Confiant", "Patient", "Neutre", "Stressé", "Impatient", "FOMO", "Frustré", "En colère", "Euphorique", "Fatigué", "Revenge trading", "Surconfiant"];

export default function AtlasReadiness({ accounts = [], user }) {
  const [form, setForm] = useState(() => createReadinessForm(accounts[0]?.id));
  const [checks, setChecks] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const checklist = useMemo(() => {
    const configured = user?.rules?.pre_trade_checklist;
    return Array.isArray(configured) && configured.length ? configured : DEFAULT_CHECKLIST;
  }, [user?.rules?.pre_trade_checklist]);
  const activeAccounts = useMemo(() => accounts.filter((account) => ["active", "actif", "funded", "challenge", "demo"].includes(String(account.status || "active").toLowerCase())), [accounts]);
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  React.useEffect(() => {
    if (!form.account_id && activeAccounts[0]?.id) update("account_id", activeAccounts[0].id);
  }, [activeAccounts, form.account_id]);

  const validate = async () => {
    if (!form.account_id) {
      toast.error("Sélectionne d’abord un compte.");
      return;
    }
    setLoading(true);
    try {
      const payload = buildReadinessPayload(form, checklist, checks, localDateKey());
      const { data } = await coach.readiness(payload);
      setResult(data);
      toast.success(data.status === "ready" ? "Processus validé" : "Contrôle terminé");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Atlas n’a pas pu vérifier ce processus.");
    } finally {
      setLoading(false);
    }
  };

  const presentation = readinessPresentation(result?.status);
  return <section className="overflow-hidden rounded-2xl border border-[#7C4DFF]/20 bg-gradient-to-br from-[#111426] to-[#090C16] shadow-[0_18px_60px_rgba(30,20,75,.12)]">
    <header className="flex flex-col gap-4 border-b border-white/[0.07] p-5 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#7C4DFF]/15 text-[#B58BFF]"><BrainCircuit className="h-5 w-5"/></span><div><div className="pe-eyebrow">ATLAS · CONTRÔLE PRÉ-TRADE</div><h2 className="mt-1 text-lg font-semibold">Valide ton processus avant la position</h2><p className="mt-1 max-w-2xl text-xs leading-5 text-[#7E8798]">Atlas contrôle tes limites, ta checklist, ton risque et ton état. Il ne prédit pas le marché.</p></div></div>
      <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#46C99A]/20 bg-[#46C99A]/[0.06] px-3 py-1.5 text-[10px] font-medium text-[#72DDB6]"><ShieldAlert className="h-3.5 w-3.5"/>Moteur déterministe</span>
    </header>

    <div className="grid gap-5 p-5 xl:grid-cols-[1.15fr_.85fr]">
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Compte"><select value={form.account_id} onChange={(event)=>update("account_id",event.target.value)} className={control}><option value="">Choisir un compte</option>{activeAccounts.map((account)=><option key={account.id} value={account.id}>{account.name} · {account.firm || "Manuel"}</option>)}</select></Field>
          <Field label="Instrument"><input value={form.instrument} onChange={(event)=>update("instrument",event.target.value)} className={control} placeholder="ES, NQ, EURUSD…"/></Field>
          <Field label="Setup"><input value={form.setup} onChange={(event)=>update("setup",event.target.value)} className={control} placeholder="FVG, breakout…"/></Field>
          <Field label="Risque prévu (%)"><input type="number" min="0" max="100" step="0.1" value={form.planned_risk_percent} onChange={(event)=>update("planned_risk_percent",event.target.value)} className={control} placeholder="0,5"/></Field>
          <Field label="Session"><input value={form.session} onChange={(event)=>update("session",event.target.value)} className={control} placeholder="New York AM"/></Field>
          <Field label="État émotionnel"><select value={form.emotion} onChange={(event)=>update("emotion",event.target.value)} className={control}><option value="">À renseigner</option>{emotions.map((emotion)=><option key={emotion}>{emotion}</option>)}</select></Field>
          <Field label="Entrée"><input type="number" step="any" value={form.entry} onChange={(event)=>update("entry",event.target.value)} className={control} placeholder="Prix prévu"/></Field>
          <Field label="Stop loss"><input type="number" step="any" value={form.stop} onChange={(event)=>update("stop",event.target.value)} className={control} placeholder="Stop prévu"/></Field>
          <Field label="Objectif / sortie"><input type="number" step="any" value={form.take_profit} onChange={(event)=>update("take_profit",event.target.value)} className={control} placeholder="Objectif prévu"/></Field>
        </div>
        <fieldset><legend className="text-xs font-medium text-[#AAB1BE]">Intensité émotionnelle</legend><div className="mt-2 grid grid-cols-3 gap-2">{[["low","Faible"],["medium","Moyenne"],["high","Forte"]].map(([id,label])=><button key={id} type="button" aria-pressed={form.emotion_intensity===id} onClick={()=>update("emotion_intensity",id)} className={`rounded-xl border px-3 py-2.5 text-xs transition ${form.emotion_intensity===id?"border-[#7C4DFF] bg-[#7C4DFF]/15 text-white":"border-white/[0.08] text-[#7E8798]"}`}>{label}</button>)}</div></fieldset>
        <fieldset><legend className="text-xs font-medium text-[#AAB1BE]">Checklist de ton plan</legend><div className="mt-3 grid gap-2 sm:grid-cols-2">{checklist.filter((item)=>item.enabled!==false).map((item)=><button key={item.id} type="button" aria-pressed={Boolean(checks[item.id])} onClick={()=>setChecks((current)=>({...current,[item.id]:!current[item.id]}))} className="flex min-h-12 items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.018] p-3 text-left"><span className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border ${checks[item.id]?"border-[#46C99A] bg-[#46C99A] text-[#06130C]":"border-white/15 text-transparent"}`}><Check className="h-3 w-3"/></span><span className="flex-1 text-xs leading-5 text-[#B5BBC9]">{item.label}</span>{item.required&&<span className="text-[9px] uppercase tracking-wide text-[#B58BFF]">Requis</span>}</button>)}</div></fieldset>
        <button type="button" onClick={validate} disabled={loading||!activeAccounts.length} className="btn-primary inline-flex min-h-12 w-full items-center justify-center gap-2 disabled:opacity-50 sm:w-auto">{loading?<Loader2 className="h-4 w-4 animate-spin"/>:<ShieldAlert className="h-4 w-4"/>}{loading?"Vérification…":"Contrôler mon processus"}</button>
      </div>

      <div className="min-h-[280px] rounded-2xl border border-white/[0.07] bg-[#070A12] p-4 sm:p-5">
        {!result?<div className="flex h-full min-h-[240px] flex-col items-center justify-center text-center"><ShieldAlert className="h-9 w-9 text-[#514879]"/><h3 className="mt-4 text-sm font-semibold">Aucun contrôle lancé</h3><p className="mt-2 max-w-sm text-xs leading-5 text-[#656D7C]">Renseigne uniquement ton processus prévu. Atlas ne donnera aucun avis sur la direction du marché.</p></div>:<><div className="flex items-start justify-between gap-4"><div><div className="text-[10px] uppercase tracking-[.16em]" style={{color:presentation.color}}>Résultat du contrôle</div><h3 className="mt-2 text-xl font-bold" style={{color:presentation.color}}>{presentation.title}</h3><p className="mt-2 text-xs leading-5 text-[#8B93A3]">{result.summary}</p></div><div className="font-numeric text-3xl font-bold" style={{color:presentation.color}}>{result.score}<span className="text-xs text-[#697183]">/100</span></div></div><div className="mt-5 space-y-2">{result.checks?.map((item)=><div key={item.id} className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.018] p-3">{item.status==="pass"?<CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#46C99A]"/>:item.status==="block"?<XCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#F26A70]"/>:<AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#FFB855]"/>}<div><div className="text-xs font-semibold">{item.label}</div><p className="mt-1 text-[11px] leading-4 text-[#7E8798]">{item.detail}</p></div></div>)}</div><p className="mt-5 border-t border-white/[0.06] pt-4 text-[10px] leading-4 text-[#596172]">{result.disclaimer}</p></>}
      </div>
    </div>
  </section>;
}

function Field({ label, children }) {
  return <label className="block"><span className="mb-2 block text-xs font-medium text-[#AAB1BE]">{label}</span>{children}</label>;
}
