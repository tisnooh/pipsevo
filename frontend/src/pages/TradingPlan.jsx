import React, { useMemo, useState } from "react";
import { BookOpenCheck, CheckCircle2, Edit3, Save, ShieldCheck, Target } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { auth } from "@/lib/api";
import { hasTradingPlanContent, normalizeTradingPlan, TRADING_PLAN_SECTION_MAX_LENGTH } from "@/lib/tradingPlan";

const sections = [
  ["mission", "Objectif et philosophie", "Décris le trader que tu veux être et ce que ton plan doit protéger."],
  ["markets", "Marchés et instruments", "Ex. NQ, ES, EURUSD — précise ce que tu trades et ce que tu évites."],
  ["sessions", "Sessions et horaires", "Définis tes plages autorisées, fuseau horaire et heure d’arrêt."],
  ["setup_definition", "Setups autorisés", "Décris les conditions indispensables et les confirmations de ton setup."],
  ["entry_rules", "Règles d’entrée", "Une règle par ligne : contexte, déclencheur, invalidation et taille."],
  ["exit_rules", "Gestion et sorties", "Stop, objectifs, passage à break-even, sorties partielles et invalidation."],
  ["risk_management", "Gestion du risque", "Risque par trade, limite quotidienne, nombre maximal de trades et drawdown."],
  ["forbidden_conditions", "Interdictions", "News, fatigue, revenge trading, volatilité ou conditions sans avantage."],
  ["review_process", "Routine de revue", "Quand et comment tu analyses tes trades et ajustes ton plan."],
  ["notes", "Notes personnelles", "Tout rappel utile qui ne rentre pas dans les sections précédentes."],
];

const inputClass = "mt-2 w-full rounded-xl border border-white/10 bg-[#0D1020] px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-[#596172] focus:border-[#7C4DFF] focus:ring-2 focus:ring-[#7C4DFF]/10";

export default function TradingPlan() {
  const { user, setUser } = useAuth();
  const initial = useMemo(() => normalizeTradingPlan(user?.trading_plan), [user?.trading_plan]);
  const [plan, setPlan] = useState(initial);
  const [editing, setEditing] = useState(() => !hasTradingPlanContent(initial));
  const [saving, setSaving] = useState(false);
  const checklist = (user?.rules?.pre_trade_checklist || []).filter((item) => item.enabled !== false);

  const save = async () => {
    if (!plan.title.trim()) { toast.error("Donne un nom à ton plan de trading."); return; }
    setSaving(true);
    try {
      const normalized = normalizeTradingPlan(plan);
      const { data } = await auth.update({ trading_plan: normalized });
      setUser(data);
      setPlan(normalized);
      setEditing(false);
      toast.success("Plan de trading enregistré");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Impossible d’enregistrer le plan");
    } finally { setSaving(false); }
  };

  return <div className="pe-page pe-page-stack mx-auto max-w-[1500px]">
    <div className="pe-page-header items-start">
      <div><div className="pe-eyebrow">CADRE DE DÉCISION</div><h1 className="pe-page-title mt-2 flex items-center gap-3"><BookOpenCheck className="h-7 w-7 text-[#B58BFF]"/>Plan de trading</h1><p className="pe-page-copy mt-2 max-w-2xl">Centralise ta méthode, tes limites et les conditions qui autorisent réellement un trade.</p></div>
      <button type="button" onClick={() => editing ? save() : setEditing(true)} disabled={saving} className="btn-primary inline-flex items-center gap-2 disabled:opacity-50">{editing ? <Save className="h-4 w-4"/> : <Edit3 className="h-4 w-4"/>}{saving ? "Sauvegarde…" : editing ? "Enregistrer le plan" : "Modifier le plan"}</button>
    </div>

    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <section className="pe-card overflow-hidden">
        <div className="border-b border-white/[0.06] p-5 sm:p-6">
          {editing ? <label className="pe-field-label">Nom du plan<input value={plan.title} maxLength={120} onChange={(event) => setPlan((current) => ({ ...current, title: event.target.value }))} className={inputClass}/></label> : <h2 className="text-2xl font-bold">{plan.title}</h2>}
        </div>
        <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-2">
          {sections.map(([key, title, placeholder]) => <article key={key} className="rounded-2xl border border-white/[0.07] bg-white/[0.018] p-4">
            <h3 className="text-sm font-semibold">{title}</h3>
            {editing ? <textarea value={plan[key]} maxLength={TRADING_PLAN_SECTION_MAX_LENGTH} rows={key === "setup_definition" || key === "entry_rules" ? 7 : 5} onChange={(event) => setPlan((current) => ({ ...current, [key]: event.target.value }))} placeholder={placeholder} className={`${inputClass} resize-y`}/> : <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#A9B0C2]">{plan[key] || "Non renseigné"}</p>}
          </article>)}
        </div>
      </section>

      <aside className="space-y-5">
        <section className="pe-card pe-card-pad"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#46C99A]/10 text-[#46C99A]"><ShieldCheck className="h-5 w-5"/></span><div><div className="text-sm font-semibold">Check-list avant trade</div><div className="text-xs text-[#7E8798]">{checklist.length} règle{checklist.length > 1 ? "s" : ""} active{checklist.length > 1 ? "s" : ""}</div></div></div><div className="mt-4 space-y-2">{checklist.length ? checklist.map((item) => <div key={item.id} className="flex gap-2 rounded-xl border border-white/[0.06] p-3 text-xs text-[#B5BBC9]"><CheckCircle2 className="h-4 w-4 shrink-0 text-[#46C99A]"/><span>{item.label}</span></div>) : <p className="text-xs leading-5 text-[#7E8798]">Aucune règle configurée.</p>}</div><Link to="/app/settings?section=rules" className="btn-ghost mt-4 inline-flex w-full items-center justify-center">Configurer mes règles</Link></section>
        <section className="pe-card pe-card-pad"><div className="flex items-center gap-3"><Target className="h-5 w-5 text-[#B58BFF]"/><h2 className="text-sm font-semibold">Captures de trades</h2></div><p className="mt-3 text-xs leading-5 text-[#7E8798]">Ajoute désormais jusqu’à six captures dans « Nouveau trade » ou « Modifier le trade ». Elles restent privées et apparaissent dans le détail du Journal.</p><Link to="/app/journal" className="btn-primary mt-4 inline-flex w-full items-center justify-center">Ouvrir le Journal</Link></section>
      </aside>
    </div>
  </div>;
}
