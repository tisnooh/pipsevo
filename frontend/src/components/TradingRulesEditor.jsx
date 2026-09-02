import React, { useState } from "react";
import { Check, ListChecks, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { DEFAULT_CHECKLIST } from "@/lib/journalPreferences";
import { useAppSettings } from "@/hooks/useAppSettings";

export const DEFAULT_TRADING_RULES = {
  max_trades: 3,
  daily_loss_limit: 300,
  max_risk_pct: 1,
  stop_after_loss: 2,
  min_rr: 1.5,
  max_session_minutes: 240,
  pre_trade_checklist: DEFAULT_CHECKLIST,
  custom_rules: [],
  configured: true,
};

export const normalizeTradingRules = (rules = {}) => ({
  ...DEFAULT_TRADING_RULES,
  ...rules,
  pre_trade_checklist: Array.isArray(rules.pre_trade_checklist) ? rules.pre_trade_checklist : DEFAULT_CHECKLIST,
  custom_rules: Array.isArray(rules.custom_rules) ? rules.custom_rules : [],
});

const NumberField = ({ label, hint, value, onChange, min, max, step = 1, suffix }) => (
  <label className="block text-xs text-[#9CA3AF]">
    <span className="flex items-center justify-between gap-2"><span>{label}</span>{suffix && <span className="text-[10px] text-[#596172]">{suffix}</span>}</span>
    <input type="number" min={min} max={max} step={step} value={value} onChange={e=>onChange(Number(e.target.value))} className="mt-2 w-full rounded-xl border border-[#6571CF]/20 bg-[#0C1122] px-4 py-3 font-mono text-white outline-none transition focus:border-[#8075ED] focus:ring-2 focus:ring-[#8075ED]/10"/>
    {hint && <span className="mt-1.5 block text-[10px] leading-relaxed text-[#596172]">{hint}</span>}
  </label>
);

const RuleToggle = ({ item, onToggle, onDelete, custom = false }) => (
  <div className="flex items-center gap-3 rounded-xl border border-[#6571CF]/20 bg-[#0D1120] p-3">
    <button type="button" role="checkbox" aria-checked={item.enabled} onClick={onToggle} className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg border transition ${item.enabled ? "border-[#7C4DFF] bg-[#7C4DFF] text-white" : "border-white/15 bg-white/[0.02] text-transparent"}`}><Check className="h-3.5 w-3.5"/></button>
    <span className={`min-w-0 flex-1 text-xs leading-relaxed ${item.enabled ? "text-[#D6DAE4]" : "text-[#687183] line-through"}`}>{item.label}</span>
    {custom && <button type="button" onClick={onDelete} aria-label={`Supprimer ${item.label}`} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[#687183] transition hover:bg-[#FF4D5A]/10 hover:text-[#F26A70]"><Trash2 className="h-4 w-4"/></button>}
  </div>
);

export default function TradingRulesEditor({ value, onChange }) {
  const { settings } = useAppSettings();
  const rules = normalizeTradingRules(value);
  const [draft, setDraft] = useState("");
  const update = (key, next) => onChange({ ...rules, [key]: next });
  const toggleChecklist = (id) => update("pre_trade_checklist", rules.pre_trade_checklist.map(item=>item.id===id ? {...item,enabled:!item.enabled} : item));
  const toggleCustom = (id) => update("custom_rules", rules.custom_rules.map(item=>item.id===id ? {...item,enabled:!item.enabled} : item));
  const addCustom = () => {
    const label=draft.trim();
    if (!label) return;
    update("custom_rules", [...rules.custom_rules, { id:`custom-${Date.now()}`, label, enabled:true }]);
    setDraft("");
  };

  return <div className="space-y-6">
    <section>
      <div className="mb-4 flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#7C4DFF]/12 text-[#B58BFF]"><ShieldCheck className="h-5 w-5"/></span><div><h3 className="text-sm font-semibold">Limites de protection</h3><p className="mt-1 text-xs text-[#687183]">Des garde-fous mesurables pour arrêter avant de dégrader ton compte.</p></div></div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <NumberField label="Trades maximum par jour" value={rules.max_trades} min={1} max={100} onChange={v=>update("max_trades",v)}/>
        <NumberField label="Perte journalière maximale" suffix={settings.currency} value={rules.daily_loss_limit} min={1} onChange={v=>update("daily_loss_limit",v)}/>
        <NumberField label="Risque maximum par trade" suffix="%" value={rules.max_risk_pct} min={0.1} max={10} step={0.1} onChange={v=>update("max_risk_pct",v)}/>
        <NumberField label="Arrêt après pertes consécutives" value={rules.stop_after_loss} min={1} max={20} onChange={v=>update("stop_after_loss",v)}/>
        <NumberField label="Ratio risque/rendement minimum" suffix="R" value={rules.min_rr} min={0.1} max={20} step={0.1} onChange={v=>update("min_rr",v)}/>
        <NumberField label="Durée maximale d’une session" suffix="minutes" value={rules.max_session_minutes} min={15} max={1440} step={15} onChange={v=>update("max_session_minutes",v)}/>
      </div>
    </section>

    <section className="rounded-2xl border border-white/[0.07] bg-white/[0.018] p-4 sm:p-5">
      <div className="mb-4 flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#46C99A]/10 text-[#46C99A]"><ListChecks className="h-5 w-5"/></span><div><h3 className="text-sm font-semibold">Check-list avant trade</h3><p className="mt-1 text-xs text-[#687183]">Active uniquement les vérifications qui doivent faire partie de ton processus.</p></div></div>
      <div className="grid gap-2 sm:grid-cols-2">{rules.pre_trade_checklist.map(item=><RuleToggle key={item.id} item={item} onToggle={()=>toggleChecklist(item.id)}/>)}</div>
    </section>

    <section className="rounded-2xl border border-white/[0.07] bg-white/[0.018] p-4 sm:p-5">
      <h3 className="text-sm font-semibold">Tes règles personnalisées</h3>
      <p className="mt-1 text-xs text-[#687183]">Ajoute par exemple « Pas de trade après 16 h » ou « Une seule tentative par setup ».</p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row"><input value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();addCustom();}}} maxLength={120} placeholder="Écris une règle personnelle…" className="min-w-0 flex-1 rounded-xl border border-[#6571CF]/20 bg-[#0C1122] px-4 py-3 text-sm text-white outline-none focus:border-[#8075ED]"/><button type="button" onClick={addCustom} disabled={!draft.trim()} className="btn-ghost inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-40"><Plus className="h-4 w-4"/>Ajouter</button></div>
      {rules.custom_rules.length > 0 ? <div className="mt-4 grid gap-2 sm:grid-cols-2">{rules.custom_rules.map(item=><RuleToggle key={item.id} item={item} custom onToggle={()=>toggleCustom(item.id)} onDelete={()=>update("custom_rules",rules.custom_rules.filter(rule=>rule.id!==item.id))}/>)}</div> : <div className="mt-4 rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-[#596172]">Aucune règle personnalisée pour le moment.</div>}
    </section>
  </div>;
}
