import React, { useCallback, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Clock3, Link2, Loader2, RefreshCw, Server, Unplug } from "lucide-react";
import { toast } from "sonner";
import { integrationConnections } from "@/lib/api";
import { canUseFeature } from "@/config/billing";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

const blankCredentials = { account_number: "", server_name: "", investor_password: "", display_name: "" };
const publicError = (error, fallback) => {
  const detail = error?.response?.data?.detail;
  return (typeof detail === "object" ? detail?.message : detail) || fallback;
};
const statusCopy = {
  connected: ["Connecté", "text-[#00E676]"],
  disconnected: ["Déconnecté", "text-[#8B93A3]"],
  expired: ["À reconnecter", "text-[#FFB855]"],
  error: ["Erreur", "text-[#FF667D]"],
  pending: ["Connexion…", "text-[#8FB4FF]"],
};

export default function IntegrationConnections({ user }) {
  const [capabilities, setCapabilities] = useState(null);
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [waitlistLoading, setWaitlistLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mode, setMode] = useState("connect");
  const [selectedConnection, setSelectedConnection] = useState(null);
  const [step, setStep] = useState("credentials");
  const [credentials, setCredentials] = useState(blankCredentials);
  const [detected, setDetected] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionId, setActionId] = useState(null);
  const frontendPlanAccess = canUseFeature(user, "mt5AutoSync");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await integrationConnections.capabilities();
      setCapabilities(data);
      const response = await integrationConnections.list();
      setConnections(response.data || []);
    } catch {
      setCapabilities({ available: false, status: "coming_soon", plan_allowed: frontendPlanAccess });
    } finally {
      setLoading(false);
    }
  }, [frontendPlanAccess]);
  useEffect(() => { load(); }, [load]);

  const available = Boolean(capabilities?.available && frontendPlanAccess);
  const resetDialog = () => {
    setCredentials(blankCredentials);
    setDetected(null);
    setStep("credentials");
    setSelectedConnection(null);
    setSubmitting(false);
  };
  const closeDialog = () => { setDialogOpen(false); resetDialog(); };
  const openConnect = (connection = null) => {
    setMode(connection ? "reconnect" : "connect");
    setSelectedConnection(connection);
    setCredentials({ ...blankCredentials, server_name: connection?.server_name || "", display_name: connection?.display_name || "" });
    setDialogOpen(true);
  };

  const testCredentials = async (event) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const { data } = await integrationConnections.testMT5(credentials);
      setDetected(data);
      setCredentials(current => ({ ...current, investor_password: "" }));
      setStep("confirm");
      toast.success("Compte MT5 détecté");
    } catch (error) {
      toast.error(publicError(error, "Impossible de tester cette connexion"));
    } finally { setSubmitting(false); }
  };

  const confirmConnection = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      if (mode === "reconnect") {
        await integrationConnections.reconnect(selectedConnection.id, credentials);
        toast.success("Compte MT5 reconnecté et synchronisé");
      } else {
        const { data } = await integrationConnections.connectMT5(credentials);
        if (data?.initial_sync?.status === "failed") {
          toast.warning("Compte connecté. L’import initial sera relancé.");
        } else {
          toast.success("Compte MT5 connecté et historique importé");
        }
      }
      closeDialog();
      await load();
    } catch (error) {
      toast.error(publicError(error, "Impossible de connecter ce compte"));
      setStep("credentials");
    } finally {
      setCredentials(blankCredentials);
      setSubmitting(false);
    }
  };

  const joinWaitlist = async () => {
    if (waitlistLoading) return;
    setWaitlistLoading(true);
    try {
      await integrationConnections.joinWaitlist();
      toast.success("Tu es inscrit sur la liste d’attente MT5");
    } catch (error) {
      toast.error(publicError(error, "Impossible de rejoindre la liste d’attente"));
    } finally { setWaitlistLoading(false); }
  };

  const sync = async (connection) => {
    setActionId(connection.id);
    try {
      await integrationConnections.sync(connection.id);
      toast.success("Synchronisation terminée");
      await load();
    } catch (error) {
      toast.error(publicError(error, "La synchronisation a échoué"));
    } finally { setActionId(null); }
  };

  const disconnect = async (connection) => {
    if (!window.confirm("Déconnecter ce compte ? Les identifiants chiffrés seront définitivement supprimés.")) return;
    setActionId(connection.id);
    try {
      await integrationConnections.disconnect(connection.id);
      toast.success("Compte déconnecté. Les identifiants ont été supprimés.");
      await load();
    } catch (error) {
      toast.error(publicError(error, "Impossible de déconnecter ce compte"));
    } finally { setActionId(null); }
  };

  return <div className="space-y-4">
    <section className="card-elev overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-white/[0.06] p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#4F8CFF]/12 text-[#8FB4FF]"><Server className="h-5 w-5"/></span>
          <div><h2 className="font-semibold">Connexions de trading</h2><p className="mt-1 max-w-2xl text-xs leading-relaxed text-[#7E8798]">Connecte une source autorisée. Les identifiants restent chiffrés côté serveur et ne sont jamais enregistrés dans ce navigateur.</p></div>
        </div>
        {!loading && <span className={`w-fit rounded-full border px-3 py-1 text-[10px] ${available ? "border-[#00E676]/20 bg-[#00E676]/[0.06] text-[#00E676]" : "border-[#FFB855]/20 bg-[#FFB855]/[0.06] text-[#FFB855]"}`}>{available ? "Disponible" : "Bientôt disponible"}</span>}
      </div>
      <div className="p-5 sm:p-6">
        <div className="rounded-2xl border border-white/[0.07] bg-[#0B0E18] p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#4F8CFF]/20 to-[#7C4DFF]/20 font-bold text-[#B9CFFF]">M5</span>
            <div className="min-w-0 flex-1"><div className="font-semibold">MetaTrader 5</div><p className="mt-1 text-xs leading-relaxed text-[#7E8798]">Import initial de l’historique puis synchronisations incrémentales. Accès investisseur en lecture seule recommandé.</p></div>
            {available ? <button onClick={()=>openConnect()} className="btn-primary inline-flex w-full items-center justify-center gap-2 sm:w-auto"><Link2 className="h-4 w-4"/>Connecter un compte</button> : <button onClick={joinWaitlist} disabled={waitlistLoading} className="btn-ghost inline-flex w-full items-center justify-center gap-2 disabled:opacity-50 sm:w-auto">{waitlistLoading?<Loader2 className="h-4 w-4 animate-spin"/>:<Clock3 className="h-4 w-4"/>}Rejoindre la liste d’attente</button>}
          </div>
          {!available && <div className="mt-4 flex items-start gap-2 rounded-xl border border-[#FFB855]/15 bg-[#FFB855]/[0.04] p-3 text-xs leading-relaxed text-[#B8A17F]"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0"/>Aucune synchronisation n’est annoncée tant qu’un fournisseur MT5 réel, ses clés et les tests de fiabilité ne sont pas activés côté serveur.</div>}
        </div>
      </div>
    </section>

    {connections.length > 0 && <section className="card-elev overflow-hidden"><div className="border-b border-white/[0.06] p-5 sm:p-6"><h2 className="font-semibold">Comptes connectés</h2></div><div className="grid gap-3 p-5 sm:p-6">{connections.map(connection => <ConnectionCard key={connection.id} connection={connection} busy={actionId === connection.id} onSync={sync} onReconnect={openConnect} onDisconnect={disconnect}/>)}</div></section>}

    <Dialog open={dialogOpen} onOpenChange={(open)=>{ if (!open) closeDialog(); }}>
      <DialogContent className="max-h-[92vh] overflow-y-auto border-white/[0.1] bg-[#090B13] text-white sm:max-w-xl">
        <DialogHeader><DialogTitle>{mode === "reconnect" ? "Reconnecter MetaTrader 5" : "Connecter MetaTrader 5"}</DialogTitle><DialogDescription className="text-[#8B93A3]">Utilise uniquement un mot de passe investisseur en lecture seule. PipsEvo ne doit jamais recevoir ton mot de passe de trading principal.</DialogDescription></DialogHeader>
        {step === "credentials" ? <CredentialsForm credentials={credentials} setCredentials={setCredentials} submitting={submitting} onSubmit={testCredentials} onCancel={closeDialog}/> : <Confirmation detected={detected} credentials={credentials} setCredentials={setCredentials} submitting={submitting} onBack={()=>setStep("credentials")} onConfirm={confirmConnection}/>}
      </DialogContent>
    </Dialog>
  </div>;
}

function ConnectionCard({ connection, busy, onSync, onReconnect, onDisconnect }) {
  const [label, color] = statusCopy[connection.connection_status] || statusCopy.pending;
  return <article className="rounded-2xl border border-white/[0.07] bg-[#0B0E18] p-4"><div className="flex flex-col gap-4 lg:flex-row lg:items-center"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="font-medium">{connection.display_name || "Compte MT5"}</span><span className={`text-[10px] ${color}`}>● {label}</span></div><div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#7E8798]"><span>{connection.broker_name || "Broker non renseigné"}</span><span>{connection.server_name}</span><span>{connection.account_number_masked}</span></div><div className="mt-2 text-[10px] text-[#596172]">Dernière synchronisation : {connection.last_successful_sync_at ? new Date(connection.last_successful_sync_at).toLocaleString("fr-FR") : "jamais"}</div>{connection.last_error_message && <div className="mt-2 text-xs text-[#FF8999]">{connection.last_error_message}</div>}</div><div className="flex flex-col gap-2 sm:flex-row">{connection.connection_status === "connected" ? <button onClick={()=>onSync(connection)} disabled={busy} className="btn-ghost inline-flex items-center justify-center gap-2 disabled:opacity-50">{busy?<Loader2 className="h-4 w-4 animate-spin"/>:<RefreshCw className="h-4 w-4"/>}Synchroniser</button> : <button onClick={()=>onReconnect(connection)} className="btn-primary inline-flex items-center justify-center gap-2"><Link2 className="h-4 w-4"/>Reconnecter</button>}<button onClick={()=>onDisconnect(connection)} disabled={busy || connection.connection_status === "disconnected"} className="btn-ghost inline-flex items-center justify-center gap-2 text-[#FF8999] disabled:opacity-40"><Unplug className="h-4 w-4"/>Déconnecter</button></div></div></article>;
}

function CredentialsForm({ credentials, setCredentials, submitting, onSubmit, onCancel }) {
  const field = (key, value) => setCredentials(current => ({ ...current, [key]: value }));
  return <form onSubmit={onSubmit} className="space-y-4">
    <label className="block text-xs text-[#9CA3AF]">Numéro de compte<input autoComplete="off" inputMode="numeric" pattern="[0-9]+" required value={credentials.account_number} onChange={event=>field("account_number",event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-[#0D1020] px-4 py-3 text-white outline-none focus:border-[#7C4DFF]"/></label>
    <label className="block text-xs text-[#9CA3AF]">Serveur MT5<input autoComplete="off" required value={credentials.server_name} onChange={event=>field("server_name",event.target.value)} placeholder="Nom exact affiché dans MT5" className="mt-2 w-full rounded-xl border border-white/10 bg-[#0D1020] px-4 py-3 text-white outline-none focus:border-[#7C4DFF]"/></label>
    <label className="block text-xs text-[#9CA3AF]">Mot de passe investisseur<input type="password" autoComplete="new-password" required value={credentials.investor_password} onChange={event=>field("investor_password",event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-[#0D1020] px-4 py-3 text-white outline-none focus:border-[#7C4DFF]"/></label>
    <label className="block text-xs text-[#9CA3AF]">Nom dans PipsEvo (facultatif)<input maxLength={100} value={credentials.display_name} onChange={event=>field("display_name",event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-[#0D1020] px-4 py-3 text-white outline-none focus:border-[#7C4DFF]"/></label>
    <DialogFooter><button type="button" onClick={onCancel} className="btn-ghost">Annuler</button><button disabled={submitting} className="btn-primary inline-flex items-center justify-center gap-2 disabled:opacity-50">{submitting?<Loader2 className="h-4 w-4 animate-spin"/>:<Server className="h-4 w-4"/>}Tester la connexion</button></DialogFooter>
  </form>;
}

function Confirmation({ detected, credentials, setCredentials, submitting, onBack, onConfirm }) {
  const values = [detected?.broker_name, detected?.server_name, detected?.account_number_masked, detected?.account_currency].filter(Boolean);
  return <div className="space-y-5"><div className="rounded-2xl border border-[#00E676]/20 bg-[#00E676]/[0.05] p-4"><div className="flex items-center gap-2 font-medium text-[#00E676]"><CheckCircle2 className="h-5 w-5"/>Compte détecté</div><div className="mt-3 flex flex-wrap gap-2">{values.map(value=><span key={value} className="rounded-lg border border-white/[0.08] bg-black/20 px-2.5 py-1 text-xs text-[#A7AFC0]">{value}</span>)}</div></div><p className="text-xs leading-relaxed text-[#8B93A3]">Le mot de passe utilisé pour le test a été effacé de la mémoire du formulaire. Saisis-le une dernière fois pour confirmer la connexion sécurisée.</p><label className="block text-xs text-[#9CA3AF]">Mot de passe investisseur<input type="password" autoComplete="new-password" required value={credentials.investor_password} onChange={event=>setCredentials(current=>({...current,investor_password:event.target.value}))} className="mt-2 w-full rounded-xl border border-white/10 bg-[#0D1020] px-4 py-3 text-white outline-none focus:border-[#7C4DFF]"/></label><DialogFooter><button type="button" onClick={onBack} disabled={submitting} className="btn-ghost">Modifier</button><button type="button" onClick={onConfirm} disabled={submitting || !credentials.investor_password} className="btn-primary inline-flex items-center justify-center gap-2 disabled:opacity-50">{submitting?<Loader2 className="h-4 w-4 animate-spin"/>:<Link2 className="h-4 w-4"/>}Confirmer et importer</button></DialogFooter></div>;
}
