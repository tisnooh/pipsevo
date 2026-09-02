import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { auth, dataExports } from "@/lib/api";
import {
  AlertTriangle, Bell, BookOpen, Check, ChevronRight, CreditCard, Crown, DatabaseBackup, Download, Globe2, KeyRound,
  ListChecks, Loader2, LogOut, Mail, MonitorSmartphone, PlugZap, Save, ShieldCheck, SlidersHorizontal, Trash2, User, Volume2
} from "lucide-react";
import { toast } from "sonner";
import TradingRulesEditor, { normalizeTradingRules } from "@/components/TradingRulesEditor";
import JournalPreferencesEditor from "@/components/JournalPreferencesEditor";
import { normalizeJournalPreferences } from "@/lib/journalPreferences";
import { useI18n } from "@/context/I18nContext";
import { readSettings, writeSettings } from "@/lib/preferences";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link, useNavigate } from "react-router-dom";
import CommercialBanner from "@/components/CommercialBanner";
import { BILLING_CONFIG, COMMERCIAL_PHASES, FEATURES, PLANS, effectivePlan, formatBillingPrice, launchOfferCopy } from "@/config/billing";
import { captureCommercialEvent } from "@/lib/commercialAnalytics";
import { downloadFullDataExport } from "@/lib/dataExport";
import { passwordValidation } from "@/lib/passwordSecurity";
import IntegrationConnections from "@/components/IntegrationConnections";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const sections = [
  { id: "profile", label: "Mon profil", subtitle: "Identité et marché", icon: User },
  { id: "rules", label: "Règles de trading", subtitle: "Limites et check-list", icon: ListChecks },
  { id: "journal", label: "Préférences du journal", subtitle: "Listes et favoris", icon: BookOpen },
  { id: "connections", label: "Connexions", subtitle: "Plateformes et synchronisation", icon: PlugZap },
  { id: "preferences", label: "Préférences", subtitle: "Affichage et trading", icon: SlidersHorizontal },
  { id: "notifications", label: "Notifications", subtitle: "Alertes et résumés", icon: Bell },
  { id: "security", label: "Sécurité", subtitle: "Accès au compte", icon: ShieldCheck },
  { id: "data", label: "Mes données", subtitle: "Export et portabilité", icon: DatabaseBackup },
  { id: "billing", label: "Abonnement", subtitle: "Plan et facturation", icon: CreditCard },
];

function Toggle({ checked, onChange, label, description, icon: Icon }) {
  return <div className="flex items-center justify-between gap-4 rounded-xl border border-[#6571CF]/20 bg-[#0D1120] p-4 transition hover:border-[#7881E8]/35">
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
  const { setLanguage } = useI18n();
  const stored = readSettings();
  const [active, setActive] = useState(()=>new URLSearchParams(window.location.search).get("section") || "profile");
  const [name, setName] = useState(user?.name || "");
  const [traderType, setTraderType] = useState(user?.trader_type || "futures");
  const [saving, setSaving] = useState(false);
  const [savingRules, setSavingRules] = useState(false);
  const [exportingData, setExportingData] = useState(false);
  const [tradingRules, setTradingRules] = useState(()=>normalizeTradingRules(user?.rules));
  const [journalPreferences, setJournalPreferences] = useState(()=>normalizeJournalPreferences(user?.journal_preferences));
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
    writeSettings({ ...preferences, ...notifications });
    setLanguage(preferences.language);
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

  const saveJournalPreferences = async () => {
    setSavingRules(true);
    try {
      const nextRules={...normalizeTradingRules(tradingRules),configured:true};
      const nextPreferences=normalizeJournalPreferences(journalPreferences);
      const { data }=await auth.update({name:name || user?.name || "Trader",trader_type:traderType,rules:nextRules,journal_preferences:nextPreferences});
      setUser(data);
      setJournalPreferences(nextPreferences);
      toast.success("Préférences du journal enregistrées");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Impossible de sauvegarder les préférences");
    } finally { setSavingRules(false); }
  };

  const exportAllData = async () => {
    if (exportingData) return;
    setExportingData(true);
    try {
      const { data } = await dataExports.all();
      const filename = downloadFullDataExport({ ...data, settings: readSettings() });
      toast.success(`Archive créée : ${filename}`);
    } catch (error) {
      toast.error(error.response?.data?.detail || error.message || "Impossible d’exporter tes données");
    } finally {
      setExportingData(false);
    }
  };

  const initials = (user?.name || user?.email || "P E").split(" ").map(x=>x[0]).join("").slice(0,2).toUpperCase();

  return <div className="pe-page pe-page-stack mx-auto max-w-[1500px]">
    <section className="pe-card relative overflow-hidden p-5 sm:p-7">
      <div className="absolute -right-24 -top-28 h-64 w-64 rounded-full bg-[#7C4DFF]/20 blur-3xl"/>
      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><div className="pe-eyebrow">Espace personnel</div><h1 className="pe-page-title mt-2">Paramètres du compte</h1><p className="pe-page-copy mt-2 max-w-xl">Personnalise ton expérience PipsEvo et garde le contrôle sur ton compte.</p></div>
        <div className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-black/20 p-3 pr-5 backdrop-blur"><span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-[#4F8CFF] to-[#7C4DFF] font-bold">{initials}</span><div><div className="text-sm font-semibold">{user?.name || "Trader"}</div><div className="mt-0.5 text-pe-micro text-[#00E676]">● Compte actif</div></div></div>
      </div>
    </section>

    <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="pe-card h-fit p-2 lg:sticky lg:top-24">
        <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-1">
          {sections.map(({id,label,subtitle,icon:Icon})=><button key={id} onClick={()=>setActive(id)} className={`flex items-center gap-3 rounded-xl p-3 text-left transition ${active===id ? "bg-[#7C4DFF]/15 text-white shadow-[inset_0_0_0_1px_rgba(124,77,255,.28)]" : "text-[#8B93A3] hover:bg-white/[0.035] hover:text-white"}`}><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${active===id ? "bg-[#7C4DFF] text-white" : "bg-white/[0.04]"}`}><Icon className="h-4 w-4"/></span><span className="min-w-0"><span className="block truncate text-xs font-medium sm:text-sm">{label}</span><span className="mt-0.5 hidden text-[10px] leading-[1.3] text-[#626A79] lg:block">{subtitle}</span></span><ChevronRight className="ml-auto hidden h-3.5 w-3.5 lg:block"/></button>)}
        </div>
      </aside>

      <main className="min-w-0">
        {active === "profile" && <form onSubmit={saveProfile} className="pe-card overflow-hidden">
          <div className="border-b border-white/[0.06] p-5 sm:p-6"><h2 className="font-semibold">Informations personnelles</h2><p className="mt-1 text-xs text-[#7E8798]">Ces informations apparaissent dans ton espace et tes rapports.</p></div>
          <div className="p-5 sm:p-6 space-y-5">
            <div className="flex items-center gap-4 rounded-xl border border-[#6571CF]/20 bg-[#0D1120] p-4"><span className="grid h-14 w-14 place-items-center rounded-xl bg-gradient-to-br from-[#4F8CFF] to-[#7C4DFF] text-lg font-bold">{initials}</span><div><div className="text-sm font-medium">Photo de profil</div><div className="mt-1 text-xs text-[#7E8798]">L’avatar utilise actuellement tes initiales.</div></div></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-xs text-[#9CA3AF]">Nom complet<input value={name} onChange={e=>setName(e.target.value)} required maxLength={80} className="pe-control mt-2 w-full"/></label>
              <label className="block text-xs text-[#9CA3AF]">
                <span className="block">Adresse email</span>
                <div className="relative mt-2">
                  <Mail aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-[#596172]"/>
                  <input value={user?.email || ""} disabled className="pe-control w-full !pl-11 disabled:opacity-60"/>
                </div>
              </label>
            </div>
            <SettingsSelect item={{label:"Marchés tradés",icon:Globe2,options:[["futures","Futures"],["cfd","CFD / Forex"],["both","Futures et CFD / Forex"]]}} value={traderType} onChange={setTraderType}/>
          </div>
          <div className="flex justify-end border-t border-white/[0.06] bg-white/[0.015] p-4 sm:px-6"><button disabled={saving} className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"><Save className="h-4 w-4"/>{saving ? "Sauvegarde…" : "Enregistrer le profil"}</button></div>
        </form>}

        {active === "rules" && <section className="card-elev overflow-hidden">
          <div className="border-b border-white/[0.06] p-5 sm:p-6"><div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#7C4DFF]/12 text-[#B58BFF]"><ListChecks className="h-5 w-5"/></span><div><h2 className="font-semibold">Règles de trading</h2><p className="mt-1 text-xs leading-relaxed text-[#7E8798]">Modifie tes limites, prépare ta check-list avant trade et ajoute tes propres règles.</p></div></div>{user?.rules?.configured === false && <div className="mt-4 rounded-xl border border-[#FFB855]/20 bg-[#FFB855]/[0.06] p-3 text-xs text-[#C9A978]">Tu avais choisi de les configurer plus tard. Les valeurs conseillées sont préremplies et restent modifiables.</div>}</div>
          <div className="p-5 sm:p-6"><TradingRulesEditor value={tradingRules} onChange={setTradingRules}/></div>
          <div className="flex justify-end border-t border-white/[0.06] bg-white/[0.015] p-4 sm:px-6"><button type="button" onClick={saveRules} disabled={savingRules} className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"><Save className="h-4 w-4"/>{savingRules ? "Sauvegarde…" : "Enregistrer mes règles"}</button></div>
        </section>}

        {active === "journal" && <section className="card-elev overflow-hidden"><div className="border-b border-[#6571CF]/15 p-5 sm:p-6"><div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#4F8CFF]/12 text-[#8FB4FF]"><BookOpen className="h-5 w-5"/></span><div><h2 className="font-semibold">Préférences du journal</h2><p className="mt-1 text-xs leading-relaxed text-[#7E8798]">Personnalise les choix rapides utilisés dans Nouveau trade. Les anciens trades conservent toujours leur valeur historique.</p></div></div></div><div className="p-5 sm:p-6"><JournalPreferencesEditor value={journalPreferences} onChange={setJournalPreferences} checklist={tradingRules.pre_trade_checklist} onChecklistChange={items=>setTradingRules(current=>({...current,pre_trade_checklist:items}))}/></div><div className="sticky bottom-0 flex justify-end border-t border-[#6571CF]/15 bg-[#090E1C]/95 p-4 backdrop-blur sm:px-6"><button type="button" onClick={saveJournalPreferences} disabled={savingRules} className="btn-primary inline-flex w-full items-center justify-center gap-2 disabled:opacity-50 sm:w-auto"><Save className="h-4 w-4"/>{savingRules?"Sauvegarde…":"Enregistrer les préférences"}</button></div></section>}

        {active === "connections" && <IntegrationConnections user={user}/>}

        {active === "preferences" && <section className="card-elev overflow-hidden">
          <div className="border-b border-white/[0.06] p-5 sm:p-6"><h2 className="font-semibold">Préférences de trading</h2><p className="mt-1 text-xs text-[#7E8798]">Adapte les montants, horaires et l’affichage à ta façon de travailler.</p></div>
          <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
            {[{label:"Devise principale",key:"currency",icon:CreditCard,options:[["USD","USD — Dollar"],["EUR","EUR — Euro"],["GBP","GBP — Livre"]]},{label:"Fuseau horaire",key:"timezone",icon:Globe2,options:[["Europe/Paris","Europe / Paris"],["America/New_York","America / New York"],["Europe/London","Europe / London"]]},{label:"Langue",key:"language",icon:Globe2,options:[["fr","Français"],["en","English"]]}].map(item=><SettingsSelect key={item.key} item={item} value={preferences[item.key]} onChange={value=>{setPreferences(current=>({...current,[item.key]:value}));if(item.key==="language")setLanguage(value)}}/>)}
            <div className="sm:col-span-2"><Toggle checked={preferences.compactMode} onChange={v=>setPreferences({...preferences,compactMode:v})} label="Affichage compact" description="Réduit l’espacement des tableaux et affiche davantage de données à l’écran." icon={SlidersHorizontal}/></div>
          </div>
          <div className="flex justify-end border-t border-white/[0.06] p-4 sm:px-6"><button onClick={()=>persistLocal("Préférences enregistrées")} className="btn-primary inline-flex items-center gap-2"><Save className="h-4 w-4"/>Enregistrer</button></div>
        </section>}

        {active === "notifications" && <section className="card-elev overflow-hidden"><div className="border-b border-white/[0.06] p-5 sm:p-6"><h2 className="font-semibold">Notifications</h2><p className="mt-1 text-xs text-[#7E8798]">Choisis les informations que PipsEvo doit te signaler.</p></div><div className="space-y-3 p-5 sm:p-6"><Toggle checked={notifications.daily} onChange={v=>setNotifications({...notifications,daily:v})} label="Résumé quotidien" description="Reçois un résumé de tes trades, de ton P&L et de ta discipline." icon={Mail}/><Toggle checked={notifications.risk} onChange={v=>setNotifications({...notifications,risk:v})} label="Alertes de risque" description="Sois averti lorsque ton drawdown ou tes limites approchent d’un seuil critique." icon={ShieldCheck}/><Toggle checked={notifications.payout} onChange={v=>setNotifications({...notifications,payout:v})} label="Objectifs de payout" description="Suis la progression de tes objectifs et les dates estimées de payout." icon={Bell}/><Toggle checked={notifications.product} onChange={v=>setNotifications({...notifications,product:v})} label="Nouveautés PipsEvo" description="Découvre les nouvelles fonctionnalités et améliorations importantes." icon={Volume2}/></div><div className="flex justify-end border-t border-white/[0.06] p-4 sm:px-6"><button onClick={()=>persistLocal("Notifications enregistrées")} className="btn-primary inline-flex items-center gap-2"><Save className="h-4 w-4"/>Enregistrer</button></div></section>}

        {active === "security" && <SecuritySettings />}

        {active === "data" && <AccountDataSettings user={user} exportAllData={exportAllData} exportingData={exportingData} />}

        {active === "billing" && <BillingSettings user={user}/>}
      </main>
    </div>
  </div>;
}

function SecuritySettings() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [endingOthers, setEndingOthers] = useState(false);
  const [endingAll, setEndingAll] = useState(false);

  const changePassword = async (event) => {
    event.preventDefault();
    if (savingPassword) return;
    const validation = passwordValidation(password);
    if (!validation.valid) return toast.error(validation.message);
    if (password !== confirmation) return toast.error("Les mots de passe ne correspondent pas.");
    setSavingPassword(true);
    try {
      await auth.updatePassword(password);
      await auth.signOutOtherSessions();
      setPassword("");
      setConfirmation("");
      toast.success("Mot de passe modifié. Les autres sessions ont été fermées.");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Impossible de modifier le mot de passe");
    } finally {
      setSavingPassword(false);
    }
  };

  const signOutOthers = async () => {
    if (endingOthers) return;
    setEndingOthers(true);
    try {
      await auth.signOutOtherSessions();
      toast.success("Les autres appareils ont été déconnectés.");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Impossible de déconnecter les autres appareils");
    } finally {
      setEndingOthers(false);
    }
  };

  const signOutEverywhere = async () => {
    if (endingAll) return;
    setEndingAll(true);
    try {
      await logout("global");
      navigate("/login", { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.detail || "Impossible de fermer les sessions");
      setEndingAll(false);
    }
  };

  return <section className="card-elev overflow-hidden">
    <div className="border-b border-white/[0.06] p-5 sm:p-6"><h2 className="font-semibold">Sécurité du compte</h2><p className="mt-1 text-xs text-[#7E8798]">Modifie ton mot de passe et garde le contrôle sur tes connexions.</p></div>
    <div className="space-y-4 p-5 sm:p-6">
      <form onSubmit={changePassword} className="rounded-2xl border border-white/[0.07] bg-[#0B0E18] p-4 sm:p-5">
        <div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#00E676]/10 text-[#00E676]"><KeyRound className="h-4 w-4" /></span><div><div className="text-sm font-medium">Changer le mot de passe</div><div className="mt-1 text-xs text-[#7E8798]">8 caractères minimum, avec une majuscule et un chiffre.</div></div></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-xs text-[#9CA3AF]">Nouveau mot de passe<input type="password" autoComplete="new-password" required value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-[#0D1020] px-4 py-3 text-white outline-none focus:border-[#7C4DFF]" /></label><label className="text-xs text-[#9CA3AF]">Confirmation<input type="password" autoComplete="new-password" required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-[#0D1020] px-4 py-3 text-white outline-none focus:border-[#7C4DFF]" /></label></div>
        <button type="submit" disabled={savingPassword} className="btn-primary mt-4 inline-flex w-full items-center justify-center gap-2 disabled:opacity-60 sm:w-auto">{savingPassword && <Loader2 className="h-4 w-4 animate-spin" />}{savingPassword ? "Modification…" : "Modifier le mot de passe"}</button>
      </form>
      <div className="rounded-2xl border border-white/[0.07] bg-[#0B0E18] p-4 sm:p-5">
        <div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#4F8CFF]/10 text-[#8FB4FF]"><MonitorSmartphone className="h-4 w-4" /></span><div><div className="flex items-center gap-2 text-sm font-medium">Session actuelle <span className="rounded-full bg-[#00E676]/10 px-2 py-0.5 text-pe-micro text-[#00E676]">Active</span></div><div className="mt-1 text-xs text-[#7E8798]">Ce navigateur · dernière activité maintenant</div></div></div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row"><button type="button" onClick={signOutOthers} disabled={endingOthers} className="btn-ghost inline-flex items-center justify-center gap-2 disabled:opacity-60">{endingOthers && <Loader2 className="h-4 w-4 animate-spin" />}Déconnecter les autres appareils</button><button type="button" onClick={signOutEverywhere} disabled={endingAll} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#FF4D5E]/25 px-4 py-2.5 text-xs text-[#FF7A87] transition hover:bg-[#FF4D5E]/10 disabled:opacity-60"><LogOut className="h-4 w-4" />Déconnecter tous les appareils</button></div>
      </div>
    </div>
  </section>;
}

function AccountDataSettings({ user, exportAllData, exportingData }) {
  const navigate = useNavigate();
  const { deleteAccount } = useAuth();
  const [confirmation, setConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);

  const removeAccount = async (event) => {
    event.preventDefault();
    if (confirmation !== "SUPPRIMER" || deleting) return;
    setDeleting(true);
    try {
      await deleteAccount(confirmation);
      toast.success("Ton compte et tes données ont été supprimés.");
      navigate("/", { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.detail || error.message || "Impossible de supprimer le compte");
      setDeleting(false);
    }
  };

  return <section className="card-elev overflow-hidden">
    <div className="border-b border-white/[0.06] p-5 sm:p-6"><div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#4F8CFF]/12 text-[#8FB4FF]"><DatabaseBackup className="h-5 w-5" /></span><div><h2 className="font-semibold">Portabilité de mes données</h2><p className="mt-1 text-xs leading-relaxed text-[#7E8798]">Télécharge une copie complète des données liées à ton compte PipsEvo.</p></div></div></div>
    <div className="space-y-4 p-5 sm:p-6">
      <div className="rounded-2xl border border-white/[0.07] bg-[#0B0E18] p-4 sm:p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="text-sm font-medium">Exporter toutes mes données</div><p className="mt-1 max-w-2xl text-xs leading-relaxed text-[#7E8798]">L’archive ZIP contient des fichiers CSV séparés pour ton profil, tes préférences, tes comptes, tes trades, tes payouts et tes analyses Atlas. Seules tes données personnelles accessibles par ta session sont incluses.</p></div><button type="button" onClick={exportAllData} disabled={exportingData} className="btn-primary inline-flex w-full shrink-0 items-center justify-center gap-2 disabled:opacity-50 sm:w-auto"><Download className="h-4 w-4" />{exportingData ? "Préparation…" : "Télécharger mon archive"}</button></div></div>
      <div className="rounded-xl border border-[#00E676]/15 bg-[#00E676]/[0.04] p-3 text-xs leading-relaxed text-[#8FAE9D]">Format UTF-8 compatible Excel. Les données de démonstration et les secrets d’authentification ne sont jamais inclus.</div>
      <div className="rounded-2xl border border-[#FF4D5E]/20 bg-[#FF4D5E]/[0.035] p-4 sm:p-5"><div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#FF4D5E]/10 text-[#FF7A87]"><AlertTriangle className="h-5 w-5" /></span><div><div className="text-sm font-medium">Supprimer définitivement mon compte</div><p className="mt-1 max-w-2xl text-xs leading-relaxed text-[#9B7C83]">Cette action supprime le profil {user?.email}, les comptes, trades, payouts, analyses Atlas et captures associés. Elle est irréversible. Exporte d’abord ton archive si tu souhaites conserver une copie.</p></div></div>
        <AlertDialog><AlertDialogTrigger asChild><button type="button" className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#FF4D5E]/30 px-4 py-2.5 text-xs text-[#FF7A87] transition hover:bg-[#FF4D5E]/10 sm:w-auto"><Trash2 className="h-4 w-4" />Supprimer mon compte</button></AlertDialogTrigger><AlertDialogContent className="mx-4 max-w-md border-white/10 bg-[#0A0C14] text-white"><AlertDialogHeader><AlertDialogTitle>Confirmer la suppression définitive</AlertDialogTitle><AlertDialogDescription className="text-[#9CA3AF]">Saisis <strong className="text-white">SUPPRIMER</strong> pour confirmer. Aucun retour arrière ne sera possible.</AlertDialogDescription></AlertDialogHeader><input autoFocus value={confirmation} onChange={(event) => setConfirmation(event.target.value.toUpperCase())} aria-label="Confirmation de suppression" className="mt-5 w-full rounded-xl border border-[#FF4D5E]/25 bg-[#0D1020] px-4 py-3 text-white outline-none focus:border-[#FF4D5E]" placeholder="SUPPRIMER" /><AlertDialogFooter className="mt-5"><AlertDialogCancel type="button" className="border-white/10 bg-transparent text-white hover:bg-white/5">Annuler</AlertDialogCancel><AlertDialogAction type="button" onClick={removeAccount} disabled={confirmation !== "SUPPRIMER" || deleting} className="bg-[#D63D4C] text-white hover:bg-[#ED4B5B] disabled:opacity-40">{deleting ? "Suppression…" : "Supprimer définitivement"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      </div>
    </div>
  </section>;
}

function BillingSettings({ user }) {
  const phase=BILLING_CONFIG.currentPhase;
  const planId=effectivePlan(user);
  const plan=PLANS[planId] || PLANS.beta;
  const isBeta=phase===COMMERCIAL_PHASES.BETA;
  const launch=launchOfferCopy();
  const enabled=Object.entries(FEATURES).filter(([,access])=>access[planId]).map(([feature])=>({dashboard:"Dashboard principal",manualJournal:"Journal manuel",basicAnalytics:"Statistiques essentielles",disciplineScore:"Score de discipline",manualPayouts:"Payouts manuels",screenshots:"Captures d’écran",multipleAccounts:"Comptes multiples",csvImport:"Import CSV avancé",aiCoach:"Coach IA",advancedAnalytics:"Analyses avancées",automaticReports:"Rapports automatiques",advancedExports:"Exports avancés",premiumAutomations:"Automatisations premium"}[feature]||feature));
  return <div className="space-y-4">
    <CommercialBanner placement="settings_billing"/>
    <section className="card-elev overflow-hidden glow-purple">
      <div className="relative border-b border-white/[0.06] p-5 sm:p-7"><Crown className="absolute -right-5 -top-7 h-32 w-32 text-[#7C4DFF]/15"/><div className="relative"><span className="rounded-full border border-[#7C4DFF]/30 bg-[#7C4DFF]/10 px-3 py-1 text-[10px] font-medium uppercase text-[#C8AEFF]">Phase · {phase.replace("_"," ")}</span><h2 className="mt-4 text-xl font-bold">{plan.name}</h2><div className="mt-2 flex items-end gap-2"><span className="text-3xl font-bold font-numeric">{formatBillingPrice(plan.price)}</span><span className="pb-1 text-sm text-[#7E8798]">{isBeta?"aujourd’hui":"/mois"}</span></div><div className="mt-4 grid gap-2 text-xs text-[#9CA3AF] sm:grid-cols-3"><div><span className="block text-[#6B7280]">Statut</span>{user?.subscription_status || "Accès bêta"}</div><div><span className="block text-[#6B7280]">Renouvellement</span>{user?.current_period_end ? new Date(user.current_period_end).toLocaleDateString("fr-FR") : "Aucun"}</div><div><span className="block text-[#6B7280]">Paiement</span>{isBeta?"Non requis":"Non configuré"}</div></div><p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#8B93A3]">{isBeta?"Ton accès gratuit prendra fin lors du lancement officiel. Tu seras informé avant tout changement. Aucun prélèvement automatique ne peut être déclenché.":phase===COMMERCIAL_PHASES.LAUNCH_OFFER?`${launch.title} ${launch.detail}`:"Gère ici ton offre dès que la facturation sécurisée sera connectée."}</p></div></div>
      <div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-6">{enabled.map(f=><div key={f} className="flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-[#0B0E18] p-3 text-xs"><span className="grid h-5 w-5 place-items-center rounded-full bg-[#00E676]/10"><Check className="h-3 w-3 text-[#00E676]"/></span>{f}</div>)}</div>
      <div className="flex flex-col gap-3 border-t border-white/[0.06] p-5 sm:flex-row sm:items-center sm:p-6"><Link to="/pricing" onClick={()=>captureCommercialEvent("pricing_viewed",{source:"settings"})} className="btn-primary text-center">Voir les offres</Link><button disabled title="Stripe n’est pas encore connecté" className="btn-ghost cursor-not-allowed opacity-50">Gérer ou annuler l’abonnement</button><p className="text-xs text-[#7E8798] sm:ml-auto">La gestion sera activée avec le portail de paiement sécurisé.</p></div>
    </section>
  </div>;
}

function SettingsSelect({ item, value, onChange }) {
  const Icon = item.icon;
  return <div className="text-xs text-[#9CA3AF]">
    <div>{item.label}</div>
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="mt-2 h-12 rounded-xl border-white/10 bg-[#0D1020] px-4 text-white shadow-none focus:ring-[#7C4DFF]/50 [&>span]:!flex [&>span]:min-w-0 [&>span]:items-center [&>span]:gap-3">
        <span className="flex min-w-0 items-center gap-3"><Icon className="h-4 w-4 shrink-0 text-[#596172]"/><SelectValue/></span>
      </SelectTrigger>
      <SelectContent className="z-[90] border-white/10 bg-[#0D1020] p-1 text-white shadow-2xl">
        {item.options.map(([optionValue,label])=><SelectItem key={optionValue} value={optionValue} className="rounded-lg py-2.5 pl-3 pr-9 focus:bg-[#7C4DFF]/20 focus:text-white">{label}</SelectItem>)}
      </SelectContent>
    </Select>
  </div>;
}
