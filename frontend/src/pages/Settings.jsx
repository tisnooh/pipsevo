import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { auth } from "@/lib/api";
import {
  Bell, Check, ChevronRight, CreditCard, Crown, Globe2, LockKeyhole,
  ListChecks, Mail, Save, ShieldCheck, SlidersHorizontal, User, Volume2
} from "lucide-react";
import { toast } from "sonner";
import TradingRulesEditor, { normalizeTradingRules } from "@/components/TradingRulesEditor";

const sections = [
  { id: "profile", label: "Mon profil", subtitle: "Identité et marché", icon: User },
  { id: "rules", label: "Règles de trading", subtitle: "Limites et check-list", icon: ListChecks },
  { id: "preferences", label: "Préférences", subtitle: "Affichage et trading", icon: SlidersHorizontal },
  { id: "notifications", label: "Notifications", subtitle: "Alertes et résumés", icon: Bell },
  { id: "security", label: "Sécurité", subtitle: "Accès au compte", icon: ShieldCheck },
  { id: "billing", label: "Abonnement", subtitle: "Plan et facturation", icon: CreditCard },
];

const getStoredSettings = () => {
  try {
    return JSON.parse(localStorage.getItem("pipsevo_settings")) || {};
  } catch {
    return {};
  }
};

function Toggle({ checked, onChange, label, description, icon: Icon }) {
  return <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/[0.07] bg-[#0B0E18] p-4 transition hover:border-white/[0.12]">
    <div className="flex items-start gap-3 min-w-0">
      {Icon && <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#7C4DFF]/10 text-[#B58BFF]"><Icon className="h-4 w-4"/></span>}
      <div><div className="text-sm font-medium">{label}</div><div className="mt-1 text-xs leading-relaxed text-[#7E8798]">{description}</div></div>
    </div>
    <button type="button" role="switch" aria-checked={checked} onClick={()=>onChange(!checked)} className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? "bg-[#7C4DFF] shadow-[0_0_18px_rgba(124,77,255,.35)]" : "bg-[#252938]"}`}>
      <span className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0"}`}/>
    </button>
  </div>;
}

export default function Settings() {
  const { user, setUser } = useAuth();
  const stored = getStoredSettings();
  const [active, setActive] = useState("profile");
  const [name, setName] = useState(user?.name || "");
  const [traderType, setTraderType] = useState(user?.trader_type || "futures");
  const [saving, setSaving] = useState(false);
  const [savingRules, setSavingRules] = useState(false);
  const [tradingRules, setTradingRules] = useState(()=>normalizeTradingRules(user?.rules));
  const [preferences, setPreferences] = useState({
    currency: stored.currency || "USD",
    timezone: stored.timezone || "Europe/Paris",
    language: stored.language || "fr",
    compactMode: stored.compactMode ?? false,
  });
  const [notifications, setNotifications] = useState({
    daily: stored.daily ?? true,
    risk: stored.risk ?? true,
    payout: stored.payout ?? true,
    product: stored.product ?? false,
  });

  const persistLocal = (message) => {
    localStorage.setItem("pipsevo_settings", JSON.stringify({ ...preferences, ...notifications }));
    window.dispatchEvent(new Event("pipsevo:settings-updated"));
    toast.success(message);
  };

  const saveProfile = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const { data } = await auth.update({ name, trader_type: traderType });
      setUser(data); toast.success("Profil mis à jour");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Impossible de sauvegarder");
    } finally { setSaving(false); }
  };

  const saveRules = async () => {
    setSavingRules(true);
    try {
      const nextRules={...normalizeTradingRules(tradingRules),configured:true};
      const { data }=await auth.update({name:name || user?.name || "Trader",trader_type:traderType,rules:nextRules});
      setTradingRules(nextRules);
      setUser(data);
      toast.success("Règles de trading enregistrées");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Impossible de sauvegarder les règles");
    } finally { setSavingRules(false); }
  };

  const initials = (user?.name || user?.email || "P E").split(" ").map(x=>x[0]).join("").slice(0,2).toUpperCase();

  return <div className="max-w-[1500px] mx-auto p-4 sm:p-7 space-y-5">
    <section className="relative overflow-hidden rounded-[24px] border border-white/[0.08] bg-gradient-to-br from-[#111426] via-[#0B0E1A] to-[#090B13] p-5 sm:p-7">
      <div className="absolute -right-24 -top-28 h-64 w-64 rounded-full bg-[#7C4DFF]/20 blur-3xl"/>
      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><div className="text-[10px] font-mono uppercase tracking-[.2em] text-[#B58BFF]">Espace personnel</div><h1 className="mt-2 text-2xl sm:text-3xl font-bold">Paramètres du compte</h1><p className="mt-2 max-w-xl text-sm text-[#8B93A3]">Personnalise ton expérience PipsEvo et garde le contrôle sur ton compte.</p></div>
        <div className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-black/20 p-3 pr-5 backdrop-blur"><span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-[#4F8CFF] to-[#7C4DFF] font-bold">{initials}</span><div><div className="text-sm font-semibold">{user?.name || "Trader"}</div><div className="mt-0.5 text-[10px] text-[#00E676]">● Compte actif</div></div></div>
      </div>
    </section>

    <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="card-elev h-fit p-2 lg:sticky lg:top-24">
        <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-1">
          {sections.map(({id,label,subtitle,icon:Icon})=><button key={id} onClick={()=>setActive(id)} className={`flex items-center gap-3 rounded-xl p-3 text-left transition ${active===id ? "bg-[#7C4DFF]/15 text-white shadow-[inset_0_0_0_1px_rgba(124,77,255,.28)]" : "text-[#8B93A3] hover:bg-white/[0.035] hover:text-white"}`}><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${active===id ? "bg-[#7C4DFF] text-white" : "bg-white/[0.04]"}`}><Icon className="h-4 w-4"/></span><span className="min-w-0"><span className="block text-xs sm:text-sm font-medium truncate">{label}</span><span className="hidden lg:block mt-0.5 text-[10px] text-[#6B7280]">{subtitle}</span></span><ChevronRight className="ml-auto hidden h-3.5 w-3.5 lg:block"/></button>)}
        </div>
      </aside>

      <main className="min-w-0">
        {active === "profile" && <form onSubmit={saveProfile} className="card-elev overflow-hidden">
          <div className="border-b border-white/[0.06] p-5 sm:p-6"><h2 className="font-semibold">Informations personnelles</h2><p className="mt-1 text-xs text-[#7E8798]">Ces informations apparaissent dans ton espace et tes rapports.</p></div>
          <div className="p-5 sm:p-6 space-y-5">
            <div className="flex items-center gap-4 rounded-2xl border border-white/[0.07] bg-[#0B0E18] p-4"><span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-[#4F8CFF] to-[#7C4DFF] text-lg font-bold">{initials}</span><div><div className="text-sm font-medium">Photo de profil</div><div className="mt-1 text-xs text-[#7E8798]">L’avatar utilise actuellement tes initiales.</div></div></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-xs text-[#9CA3AF]">Nom complet<input value={name} onChange={e=>setName(e.target.value)} required maxLength={80} className="mt-2 w-full rounded-xl border border-white/10 bg-[#0D1020] px-4 py-3 text-white outline-none transition focus:border-[#7C4DFF] focus:ring-2 focus:ring-[#7C4DFF]/10"/></label>
              <label className="block text-xs text-[#9CA3AF]">Adresse email<div className="relative"><Mail className="absolute left-4 top-5 h-4 w-4 text-[#596172]"/><input value={user?.email || ""} disabled className="mt-2 w-full rounded-xl border border-white/[0.07] bg-[#090B13] py-3 pl-11 pr-4 text-[#6B7280]"/></div></label>
            </div>
            <label className="block text-xs text-[#9CA3AF]">Marchés tradés<select value={traderType} onChange={e=>setTraderType(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-[#0D1020] px-4 py-3 text-white outline-none focus:border-[#7C4DFF]"><option value="futures">Futures</option><option value="cfd">CFD / Forex</option><option value="both">Futures et CFD / Forex</option></select></label>
          </div>
          <div className="flex justify-end border-t border-white/[0.06] bg-white/[0.015] p-4 sm:px-6"><button disabled={saving} className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"><Save className="h-4 w-4"/>{saving ? "Sauvegarde…" : "Enregistrer le profil"}</button></div>
        </form>}

        {active === "rules" && <section className="card-elev overflow-hidden">
          <div className="border-b border-white/[0.06] p-5 sm:p-6"><div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#7C4DFF]/12 text-[#B58BFF]"><ListChecks className="h-5 w-5"/></span><div><h2 className="font-semibold">Règles de trading</h2><p className="mt-1 text-xs leading-relaxed text-[#7E8798]">Modifie tes limites, prépare ta check-list avant trade et ajoute tes propres règles.</p></div></div>{user?.rules?.configured === false && <div className="mt-4 rounded-xl border border-[#FFB855]/20 bg-[#FFB855]/[0.06] p-3 text-xs text-[#C9A978]">Tu avais choisi de les configurer plus tard. Les valeurs conseillées sont préremplies et restent modifiables.</div>}</div>
          <div className="p-5 sm:p-6"><TradingRulesEditor value={tradingRules} onChange={setTradingRules}/></div>
          <div className="flex justify-end border-t border-white/[0.06] bg-white/[0.015] p-4 sm:px-6"><button type="button" onClick={saveRules} disabled={savingRules} className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"><Save className="h-4 w-4"/>{savingRules ? "Sauvegarde…" : "Enregistrer mes règles"}</button></div>
        </section>}

        {active === "preferences" && <section className="card-elev overflow-hidden">
          <div className="border-b border-white/[0.06] p-5 sm:p-6"><h2 className="font-semibold">Préférences de trading</h2><p className="mt-1 text-xs text-[#7E8798]">Adapte les montants, horaires et l’affichage à ta façon de travailler.</p></div>
          <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
            {[{label:"Devise principale",key:"currency",icon:CreditCard,options:[["USD","USD — Dollar"],["EUR","EUR — Euro"],["GBP","GBP — Livre"]]},{label:"Fuseau horaire",key:"timezone",icon:Globe2,options:[["Europe/Paris","Europe / Paris"],["America/New_York","America / New York"],["Europe/London","Europe / London"]]},{label:"Langue",key:"language",icon:Globe2,options:[["fr","Français"],["en","English"]]}].map(item=><label key={item.key} className="text-xs text-[#9CA3AF]">{item.label}<div className="relative"><item.icon className="absolute left-4 top-5 h-4 w-4 text-[#596172]"/><select value={preferences[item.key]} onChange={e=>setPreferences({...preferences,[item.key]:e.target.value})} className="mt-2 w-full rounded-xl border border-white/10 bg-[#0D1020] py-3 pl-11 pr-4 text-white outline-none focus:border-[#7C4DFF]">{item.options.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></div></label>)}
            <div className="sm:col-span-2"><Toggle checked={preferences.compactMode} onChange={v=>setPreferences({...preferences,compactMode:v})} label="Affichage compact" description="Réduit l’espacement des tableaux et affiche davantage de données à l’écran." icon={SlidersHorizontal}/></div>
          </div>
          <div className="flex justify-end border-t border-white/[0.06] p-4 sm:px-6"><button onClick={()=>persistLocal("Préférences enregistrées")} className="btn-primary inline-flex items-center gap-2"><Save className="h-4 w-4"/>Enregistrer</button></div>
        </section>}

        {active === "notifications" && <section className="card-elev overflow-hidden"><div className="border-b border-white/[0.06] p-5 sm:p-6"><h2 className="font-semibold">Notifications</h2><p className="mt-1 text-xs text-[#7E8798]">Choisis les informations que PipsEvo doit te signaler.</p></div><div className="space-y-3 p-5 sm:p-6"><Toggle checked={notifications.daily} onChange={v=>setNotifications({...notifications,daily:v})} label="Résumé quotidien" description="Reçois un résumé de tes trades, de ton P&L et de ta discipline." icon={Mail}/><Toggle checked={notifications.risk} onChange={v=>setNotifications({...notifications,risk:v})} label="Alertes de risque" description="Sois averti lorsque ton drawdown ou tes limites approchent d’un seuil critique." icon={ShieldCheck}/><Toggle checked={notifications.payout} onChange={v=>setNotifications({...notifications,payout:v})} label="Objectifs de payout" description="Suis la progression de tes objectifs et les dates estimées de payout." icon={Bell}/><Toggle checked={notifications.product} onChange={v=>setNotifications({...notifications,product:v})} label="Nouveautés PipsEvo" description="Découvre les nouvelles fonctionnalités et améliorations importantes." icon={Volume2}/></div><div className="flex justify-end border-t border-white/[0.06] p-4 sm:px-6"><button onClick={()=>persistLocal("Notifications enregistrées")} className="btn-primary inline-flex items-center gap-2"><Save className="h-4 w-4"/>Enregistrer</button></div></section>}

        {active === "security" && <section className="card-elev overflow-hidden"><div className="border-b border-white/[0.06] p-5 sm:p-6"><h2 className="font-semibold">Sécurité du compte</h2><p className="mt-1 text-xs text-[#7E8798]">Protège tes données et surveille tes accès.</p></div><div className="space-y-3 p-5 sm:p-6"><div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-white/[0.07] bg-[#0B0E18] p-4"><div className="flex gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#00E676]/10 text-[#00E676]"><LockKeyhole className="h-4 w-4"/></span><div><div className="text-sm font-medium">Mot de passe</div><div className="mt-1 text-xs text-[#7E8798]">La modification sécurisée n’est pas encore disponible dans cette version.</div></div></div><button disabled title="Fonction indisponible pendant la bêta" className="rounded-xl border border-white/10 px-4 py-2 text-xs text-[#6B7280] cursor-not-allowed">Indisponible</button></div><div className="flex items-center justify-between gap-4 rounded-2xl border border-white/[0.07] bg-[#0B0E18] p-4"><div><div className="flex items-center gap-2 text-sm font-medium"><span className="h-2 w-2 rounded-full bg-[#00E676]"/>Session actuelle</div><div className="mt-1 text-xs text-[#7E8798]">Navigateur actuel · dernière activité maintenant</div></div><span className="rounded-full bg-[#00E676]/10 px-2.5 py-1 text-[10px] text-[#00E676]">Active</span></div></div></section>}

        {active === "billing" && <section className="card-elev overflow-hidden glow-purple"><div className="relative border-b border-white/[0.06] p-5 sm:p-7"><Crown className="absolute -right-5 -top-7 h-32 w-32 text-[#7C4DFF]/15"/><div className="relative"><span className="rounded-full border border-[#7C4DFF]/30 bg-[#7C4DFF]/10 px-3 py-1 text-[10px] font-medium text-[#C8AEFF]">PLAN ACTUEL · BÊTA</span><h2 className="mt-4 text-xl font-bold">Accès bêta</h2><div className="mt-2 flex items-end gap-2"><span className="text-3xl font-bold font-mono">0 €</span><span className="pb-1 text-sm text-[#7E8798]">aujourd’hui</span></div><p className="mt-3 text-sm text-[#8B93A3]">Aucune carte bancaire enregistrée et aucun prélèvement pendant la bêta.</p></div></div><div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-6">{["Comptes multiples","Coach IA selon disponibilité","Trading DNA","Analyses avancées","Rapports détaillés","Support bêta"].map(f=><div key={f} className="flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-[#0B0E18] p-3 text-xs"><span className="grid h-5 w-5 place-items-center rounded-full bg-[#00E676]/10"><Check className="h-3 w-3 text-[#00E676]"/></span>{f}</div>)}</div><div className="border-t border-white/[0.06] p-5 sm:p-6"><button disabled title="Paiement indisponible pendant la bêta" className="btn-primary w-full sm:w-auto cursor-not-allowed opacity-50">Facturation indisponible</button><p className="mt-2 text-xs text-[#7E8798]">Une offre Pro à 19,99 €/mois est envisagée après la bêta. Le prix et les conditions seront confirmés avant toute facturation.</p></div></section>}
      </main>
    </div>
  </div>;
}
