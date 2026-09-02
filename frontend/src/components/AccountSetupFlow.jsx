import React, { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Cloud, FileUp, Loader2, PenLine, ShieldCheck, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { accounts } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useAppSettings } from "@/hooks/useAppSettings";
import { PROP_FIRMS, marketKeys } from "@/lib/journalPreferences";
import IntegrationConnections from "@/components/IntegrationConnections";

const ACCOUNT_SIZES = [10000, 25000, 50000, 100000, 200000];

const accountDefaults = (traderType, firm = "") => ({
  name: "Compte principal",
  firm,
  market_type: traderType === "both" ? "futures" : traderType,
  balance: 50000,
  initial_balance: 50000,
  profit_target: 5000,
  max_drawdown: 4000,
  daily_loss_limit: 2500,
  status: "active",
});

export default function AccountSetupFlow({ onComplete, onCancel, welcome = false }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { settings } = useAppSettings();
  const traderType = user?.trader_type || "futures";
  const firms = useMemo(() => {
    const markets = marketKeys(traderType);
    return PROP_FIRMS.filter(firm => firm.markets.some(market => markets.includes(market)));
  }, [traderType]);
  const [step, setStep] = useState("choice");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => accountDefaults(traderType, firms[0]?.name || ""));

  const chooseSize = value => {
    const size = Number(value);
    setForm(current => ({
      ...current,
      initial_balance: size,
      balance: size,
      profit_target: Math.round(size * 0.1),
      max_drawdown: Math.round(size * 0.08),
      daily_loss_limit: Math.round(size * 0.05),
    }));
  };

  const saveManual = async event => {
    event.preventDefault();
    if (saving) return;
    const payload = {
      ...form,
      balance: Number(form.balance),
      initial_balance: Number(form.initial_balance),
      profit_target: Number(form.profit_target),
      max_drawdown: Number(form.max_drawdown),
      daily_loss_limit: Number(form.daily_loss_limit),
    };
    if (payload.initial_balance <= 0 || payload.max_drawdown <= 0 || payload.profit_target <= 0) {
      toast.error("Le capital, l’objectif et le drawdown doivent être supérieurs à zéro.");
      return;
    }
    setSaving(true);
    try {
      const { data } = await accounts.create(payload);
      toast.success("Compte ajouté. Tu peux maintenant importer tes trades.");
      onComplete?.({ method: "manual", account: data });
    } catch (error) {
      toast.error(error.response?.data?.detail || "Impossible de créer ce compte.");
    } finally { setSaving(false); }
  };

  if (step === "automatic") {
    return <div className="space-y-5">
      <FlowHeader eyebrow="Synchronisation automatique" title="Choisis ta plateforme" copy="PipsEvo n’affiche comme actives que les connexions réellement configurées côté serveur." onBack={() => setStep("choice")}/>
      <IntegrationConnections compact returnPath="/app/accounts" onConnectionReady={result => onComplete?.({ method: "automatic", ...result })}/>
    </div>;
  }

  if (step === "manual") {
    return <form onSubmit={saveManual} className="space-y-5">
      <FlowHeader eyebrow="Ajout manuel" title="Configure ton compte" copy="Renseigne les limites officielles de ton compte. Elles serviront au suivi du risque et des objectifs." onBack={() => setStep("choice")}/>
      <div className="grid gap-4 sm:grid-cols-2">
        <SetupField label="Nom du compte"><input required maxLength={100} value={form.name} onChange={event => setForm({...form, name: event.target.value})}/></SetupField>
        <SetupField label="Prop firm ou courtier"><select required value={form.firm} onChange={event => {
          const firm = firms.find(item => item.name === event.target.value);
          setForm(current => ({...current, firm: event.target.value, market_type: firm?.markets.includes(current.market_type) ? current.market_type : firm?.markets[0] || current.market_type}));
        }}>{firms.map(firm => <option key={firm.name} value={firm.name}>{firm.name}</option>)}</select></SetupField>
        <SetupField label="Marché"><select value={form.market_type} onChange={event => setForm({...form, market_type: event.target.value})}>{(firms.find(item => item.name === form.firm)?.markets || marketKeys(traderType)).map(market => <option key={market} value={market}>{market === "futures" ? "Futures" : "CFD / Forex"}</option>)}</select></SetupField>
        <SetupField label={`Capital initial (${settings.currency})`}><input required min="1" type="number" inputMode="decimal" value={form.initial_balance} onChange={event => setForm({...form, initial_balance: event.target.value, balance: event.target.value})}/></SetupField>
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-[0.16em] text-[#687184]">Tailles fréquentes</div>
        <div className="mt-2 flex flex-wrap gap-2">{ACCOUNT_SIZES.map(size => <button key={size} type="button" onClick={() => chooseSize(size)} className={`rounded-xl border px-3 py-2 text-xs font-numeric transition ${Number(form.initial_balance) === size ? "border-[#7C4DFF]/70 bg-[#7C4DFF]/15 text-white" : "border-white/[0.08] bg-white/[0.025] text-[#8B93A3] hover:border-white/20"}`}>{size >= 1000 ? `${size / 1000}K` : size}</button>)}</div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <SetupField label={`Objectif de profit (${settings.currency})`}><input required min="1" type="number" inputMode="decimal" value={form.profit_target} onChange={event => setForm({...form, profit_target: event.target.value})}/></SetupField>
        <SetupField label={`Drawdown maximal (${settings.currency})`}><input required min="1" type="number" inputMode="decimal" value={form.max_drawdown} onChange={event => setForm({...form, max_drawdown: event.target.value})}/></SetupField>
        <SetupField label={`Perte quotidienne max. (${settings.currency})`} className="sm:col-span-2"><input required min="0" type="number" inputMode="decimal" value={form.daily_loss_limit} onChange={event => setForm({...form, daily_loss_limit: event.target.value})}/></SetupField>
      </div>
      <div className="rounded-2xl border border-[#4F8CFF]/15 bg-[#4F8CFF]/[0.045] p-4 text-xs leading-relaxed text-[#8EA5CB]">L’ajout manuel crée le suivi du compte. Les trades seront ensuite ajoutés depuis le journal ou un import CSV / HTML MetaTrader.</div>
      <button disabled={saving} className="btn-primary inline-flex w-full items-center justify-center gap-2 py-3 disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin"/> : <ArrowRight className="h-4 w-4"/>}{saving ? "Création…" : "Créer ce compte"}</button>
    </form>;
  }

  return <div>
    <div className="flex items-start justify-between gap-4">
      <div><div className="pe-eyebrow">{welcome ? "Dernière étape" : "Nouveau compte"}</div><h2 className="mt-2 text-xl font-bold sm:text-2xl">{welcome ? "Connecte ton premier compte" : "Comment veux-tu ajouter ce compte ?"}</h2><p className="mt-2 max-w-2xl text-xs leading-relaxed text-[#7E8798]">La synchronisation est idéale pour un suivi continu. L’ajout manuel reste disponible sans partager d’identifiants de trading.</p></div>
      {onCancel && <button type="button" onClick={onCancel} className="text-xs text-[#7E8798] transition hover:text-white">Fermer</button>}
    </div>
    <div className="mt-6 grid gap-3 sm:grid-cols-2">
      <ChoiceCard icon={Cloud} badge="Recommandé" title="Connexion automatique" copy="Autorise une plateforme en lecture seule et récupère automatiquement l’historique puis les nouveaux trades." detail="MT4 / MT5 et connecteurs activés" onClick={() => setStep("automatic")}/>
      <ChoiceCard icon={PenLine} title="Configuration manuelle" copy="Crée le compte avec son capital, ses limites et ses objectifs, puis ajoute les trades à ton rythme." detail="Aucun identifiant de plateforme requis" onClick={() => setStep("manual")}/>
      <button type="button" onClick={() => navigate("/app/journal?import=1")} className="group flex items-center gap-4 rounded-2xl border border-dashed border-[#4F8CFF]/20 bg-[#4F8CFF]/[0.025] p-4 text-left transition hover:border-[#4F8CFF]/45 sm:col-span-2"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#4F8CFF]/10 text-[#8FB4FF]"><FileUp className="h-5 w-5"/></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">Importer un fichier</span><span className="mt-1 block text-xs leading-relaxed text-[#7E8798]">Utilise un export CSV ou un rapport HTML MetaTrader si la synchronisation n’est pas disponible.</span></span><ArrowRight className="h-4 w-4 text-[#61708B] transition group-hover:translate-x-1 group-hover:text-white"/></button>
    </div>
    <div className="mt-5 flex items-center gap-2 text-[10px] text-[#667083]"><ShieldCheck className="h-3.5 w-3.5 text-[#46C99A]"/>Les connexions automatiques utilisent un accès de lecture et des secrets chiffrés côté serveur.</div>
  </div>;
}

function FlowHeader({ eyebrow, title, copy, onBack }) {
  return <div className="flex items-start gap-3"><button type="button" onClick={onBack} aria-label="Retour" className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/[0.08] text-[#8B93A3] transition hover:bg-white/5 hover:text-white"><ArrowLeft className="h-4 w-4"/></button><div><div className="pe-eyebrow">{eyebrow}</div><h2 className="mt-2 text-xl font-bold sm:text-2xl">{title}</h2><p className="mt-1 text-xs leading-relaxed text-[#7E8798]">{copy}</p></div></div>;
}

function ChoiceCard({ icon: Icon, badge, title, copy, detail, onClick }) {
  return <button type="button" onClick={onClick} className="group relative min-h-52 rounded-xl border border-[#6571CF]/20 bg-[#0D1120] p-5 text-left transition hover:-translate-y-0.5 hover:border-[#8075ED]/45 hover:bg-[#8075ED]/[0.045]">
    {badge && <span className="absolute right-4 top-4 rounded-full border border-[#46C99A]/20 bg-[#46C99A]/[0.07] px-2 py-1 text-[9px] font-medium text-[#67E9AD]">{badge}</span>}
    <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-[#7C4DFF]/20 to-[#4F8CFF]/12 text-[#B69CFF]"><Icon className="h-5 w-5"/></span>
    <span className="mt-5 block text-sm font-semibold">{title}</span><span className="mt-2 block text-xs leading-relaxed text-[#7E8798]">{copy}</span><span className="mt-4 flex items-center gap-2 text-[10px] text-[#8D79C8]"><Sparkles className="h-3 w-3"/>{detail}</span>
  </button>;
}

function SetupField({ label, children, className = "" }) {
  return <label className={`block text-xs text-[#9CA3AF] ${className}`}>{label}{React.cloneElement(children, { className: `${children.props.className || ""} mt-2 w-full rounded-xl border border-[#6571CF]/20 bg-[#0C1122] px-4 py-3 text-white outline-none transition focus:border-[#8075ED] focus:ring-4 focus:ring-[#8075ED]/10` })}</label>;
}
