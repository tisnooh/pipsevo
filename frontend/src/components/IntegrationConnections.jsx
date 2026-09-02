import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle, CheckCircle2, ChevronRight, Clock3, Database, ExternalLink,
  FileUp, Link2, Loader2, LockKeyhole, RefreshCw, Server, Unplug,
} from "lucide-react";
import { toast } from "sonner";
import { integrationConnections } from "@/lib/api";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

const PROVIDERS = [
  { id: "ctrader", name: "cTrader", mark: "cT", copy: "OAuth officiel et comptes cTrader autorisés en lecture seule." },
  { id: "metaapi", name: "MetaTrader 4 / 5", mark: "M5", copy: "Configuration sécurisée via MetaApi, sans conserver ton mot de passe MetaTrader." },
  { id: "tradelocker", name: "TradeLocker", mark: "TL", copy: "Jeton JWT officiel, comptes détectés puis sélectionnés séparément." },
  { id: "tradovate", name: "Tradovate", mark: "TV", copy: "OAuth officiel pour comptes Futures, fills et historique de trades." },
  { id: "ninjatrader", name: "NinjaTrader", mark: "NT", copy: "Import de fichier disponible en attendant l’accès développeur officiel." },
];

const EMPTY_META = { platform: "mt5", name: "", login: "", server: "", password: "" };
const EMPTY_TL = { email: "", password: "", server: "", environment: "demo" };
const statusCopy = {
  connected: ["Connectée", "text-[#00E676]"],
  disconnected: ["Déconnectée", "text-[#8B93A3]"],
  expired: ["Autorisation expirée", "text-[#FFB855]"],
  error: ["Action requise", "text-[#FF667D]"],
  pending: ["Configuration en cours", "text-[#8FB4FF]"],
};
const publicError = (error, fallback) => {
  const detail = error?.response?.data?.detail;
  return (typeof detail === "object" ? detail?.message : detail) || fallback;
};
const normalizeAccounts = accounts => (accounts || []).map(item => ({
  ...item,
  external_account_id: item.external_account_id,
  account_name: item.account_name || item.display_name,
  currency: item.currency || item.account_currency,
}));
const clearIntegrationQuery = () => {
  const url = new URL(window.location.href);
  ["integration", "provider", "connection", "reason"].forEach(key => url.searchParams.delete(key));
  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
};

export default function IntegrationConnections({ compact = false, returnPath = "/app/settings", onConnectionReady }) {
  const connectionReadyRef = useRef(onConnectionReady);
  const [capabilities, setCapabilities] = useState({ providers: [] });
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [formProvider, setFormProvider] = useState(null);
  const [metaForm, setMetaForm] = useState(EMPTY_META);
  const [tlForm, setTlForm] = useState(EMPTY_TL);
  const [configuration, setConfiguration] = useState(null);
  const [selectConnection, setSelectConnection] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => { connectionReadyRef.current = onConnectionReady; }, [onConnectionReady]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: caps }, { data: rows }] = await Promise.all([
        integrationConnections.capabilities(), integrationConnections.list(),
      ]);
      setCapabilities(caps || { providers: [] });
      const currentRows = rows || [];
      setConnections(currentRows);
      const params = new URLSearchParams(window.location.search);
      if (params.get("integration") === "connected") {
        const connection = currentRows.find(item => item.id === params.get("connection"));
        const detected = normalizeAccounts(connection?.integration_accounts);
        if (connection && detected.length > 1) {
          setSelectConnection({ ...connection, integration_accounts: detected });
          setSelectedIds(
            detected.filter(item => ["selected", "connected", "error"].includes(item.status)).map(item => item.external_account_id),
          );
        } else if (connection) {
          toast.success("Compte connecté. L’historique va être synchronisé en arrière-plan.");
          connectionReadyRef.current?.({ provider: connection.provider, connection });
        }
        clearIntegrationQuery();
      } else if (params.get("integration") === "error") {
        toast.error(params.get("reason") || "L’autorisation de la plateforme a échoué.");
        clearIntegrationQuery();
      }
    } catch (error) {
      toast.error(publicError(error, "Impossible de charger les connexions"));
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  const capabilityMap = useMemo(
    () => Object.fromEntries((capabilities.providers || []).map(item => [item.provider, item])),
    [capabilities],
  );

  const launchProvider = async (provider) => {
    if (!provider) {
      toast.error("Cette ancienne connexion doit être recréée depuis sa plateforme.");
      return;
    }
    const capability = capabilityMap[provider.id];
    if (!capability?.available) return;
    if (["ctrader", "tradovate"].includes(provider.id)) {
      setActionId(provider.id);
      try {
        const { data } = await integrationConnections.startOAuth(provider.id, returnPath);
        window.location.assign(data.authorization_url);
      } catch (error) {
        toast.error(publicError(error, "Impossible de démarrer l’autorisation"));
        setActionId(null);
      }
      return;
    }
    setFormProvider(provider.id);
  };

  const submitCredentials = async (event) => {
    event.preventDefault();
    setActionId(formProvider);
    try {
      if (formProvider === "metaapi") {
        const payload = { ...metaForm };
        const { data } = await integrationConnections.startMetaApi(payload);
        setMetaForm(EMPTY_META);
        if (data.next_step === "configure_provider_then_finalize" && data.configuration_link) {
          setConfiguration(data);
          window.open(data.configuration_link, "_blank", "noopener,noreferrer");
          toast.success("Lien MetaApi ouvert dans un nouvel onglet");
        } else {
          setFormProvider(null);
          await load();
          toast.success("Compte transmis à MetaApi. Connexion et import en cours.");
          void pollMetaApi(data.connection);
        }
      } else if (formProvider === "tradelocker") {
        const { data } = await integrationConnections.connectTradeLocker(tlForm);
        setTlForm(EMPTY_TL);
        setFormProvider(null);
        await load();
        if ((data.accounts || []).length > 1) {
          openSelection(data.connection.id, data.accounts);
          toast.success("TradeLocker autorisé. Choisis les comptes à synchroniser.");
        } else {
          toast.success("Compte TradeLocker connecté. Synchronisation en arrière-plan lancée.");
          onConnectionReady?.({ provider: "tradelocker", connection: data.connection });
        }
      }
    } catch (error) {
      toast.error(publicError(error, "La connexion n’a pas pu être terminée"));
    } finally { setActionId(null); }
  };

  const finalizeMetaApi = async (connectionOverride = null) => {
    const target = connectionOverride || configuration?.connection;
    if (!target?.id) return;
    setActionId(target.id);
    try {
      const { data } = await integrationConnections.finalizeMetaApi(target.id);
      setConfiguration(null);
      setFormProvider(null);
      await load();
      if ((data.accounts || []).length > 1) {
        openSelection(data.connection.id, data.accounts);
      } else {
        toast.success("Compte MetaTrader connecté. Synchronisation en arrière-plan lancée.");
        onConnectionReady?.({ provider: "metaapi", connection: data.connection });
      }
    } catch (error) {
      toast.error(publicError(error, "La configuration MetaApi n’est pas encore terminée"));
    } finally { setActionId(null); }
  };

  const pollMetaApi = async (connection, attempts = 8) => {
    if (!connection?.id) return;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      await new Promise(resolve => window.setTimeout(resolve, 5000));
      try {
        const { data } = await integrationConnections.finalizeMetaApi(connection.id);
        await load();
        toast.success("Compte MetaTrader connecté et synchronisation lancée.");
        connectionReadyRef.current?.({ provider: "metaapi", connection: data.connection });
        return;
      } catch (error) {
        const detail = error?.response?.data?.detail;
        const code = typeof detail === "object" ? detail?.code : null;
        if (code !== "provider_configuration_pending") {
          toast.error(publicError(error, "La connexion MetaTrader a échoué"));
          return;
        }
      }
    }
    toast.info("MetaApi termine encore la connexion. Elle apparaîtra automatiquement dès qu’elle sera prête.");
    await load();
  };

  const openSelection = (connectionId, accounts) => {
    const connection = connections.find(item => item.id === connectionId) || {
      id: connectionId, integration_accounts: accounts || [],
    };
    const normalizedAccounts = normalizeAccounts(accounts || connection.integration_accounts);
    setSelectConnection({ ...connection, integration_accounts: normalizedAccounts });
    setSelectedIds(
      normalizedAccounts.filter(item => ["selected", "connected", "error"].includes(item.status)).map(item => item.external_account_id),
    );
  };

  const saveSelection = async () => {
    if (!selectedIds.length) return;
    setActionId(selectConnection.id);
    try {
      await integrationConnections.selectAccounts(selectConnection.id, selectedIds);
      toast.success("Comptes sélectionnés et import initial lancé");
      onConnectionReady?.({ provider: selectConnection.provider, connection: selectConnection });
      setSelectConnection(null);
      await load();
    } catch (error) {
      toast.error(publicError(error, "Impossible d’enregistrer cette sélection"));
    } finally { setActionId(null); }
  };

  const syncAccount = async (account) => {
    setActionId(account.id);
    try {
      await integrationConnections.syncAccount(account.id);
      toast.success("Synchronisation terminée");
      await load();
    } catch (error) { toast.error(publicError(error, "La synchronisation a échoué")); }
    finally { setActionId(null); }
  };

  const disconnect = async (connection) => {
    if (!window.confirm("Déconnecter cette source et supprimer ses jetons chiffrés ?")) return;
    setActionId(connection.id);
    try {
      await integrationConnections.disconnect(connection.id);
      toast.success("Source déconnectée et accès local supprimé");
      await load();
    } catch (error) { toast.error(publicError(error, "Impossible de déconnecter cette source")); }
    finally { setActionId(null); }
  };

  return <div className="space-y-5">
    <section className={`${compact ? "overflow-hidden rounded-2xl border border-white/[0.07] bg-[#090C15]" : "card-elev overflow-hidden"}`}>
      {!compact && <div className="flex flex-col gap-4 border-b border-white/[0.06] p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#7C4DFF]/12 text-[#A98BFF]"><Database className="h-5 w-5"/></span>
          <div><h2 className="font-semibold">Centre de connexions</h2><p className="mt-1 max-w-2xl text-xs leading-relaxed text-[#7E8798]">Autorise une plateforme, choisis précisément les comptes à suivre, puis laisse PipsEvo importer uniquement les données de lecture.</p></div>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#00E676]/15 bg-[#00E676]/[0.04] px-3 py-1 text-[10px] text-[#61E7AE]"><LockKeyhole className="h-3 w-3"/>Jetons chiffrés côté serveur</span>
      </div>}
      <div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-6 xl:grid-cols-3">
        {PROVIDERS.map(provider => {
          const capability = capabilityMap[provider.id];
          const available = Boolean(capability?.available);
          const busy = actionId === provider.id;
          return <article key={provider.id} className="flex min-h-44 flex-col rounded-2xl border border-white/[0.07] bg-[#0B0E18] p-4 transition-colors hover:border-white/[0.12]">
            <div className="flex items-start justify-between gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-[#7C4DFF]/20 to-[#4F8CFF]/15 font-semibold text-[#C8B9FF]">{provider.mark}</span><span className={`rounded-full border px-2.5 py-1 text-[9px] ${available ? "border-[#00E676]/15 text-[#00E676]" : "border-white/[0.08] text-[#737C8D]"}`}>{available ? "Disponible" : provider.id === "ninjatrader" ? "Accès développeur requis" : "Configuration serveur requise"}</span></div>
            <h3 className="mt-4 text-sm font-semibold">{provider.name}</h3><p className="mt-1 flex-1 text-xs leading-relaxed text-[#7E8798]">{provider.copy}</p>
            <button onClick={() => launchProvider(provider)} disabled={!available || busy} className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-[#B69CFF] disabled:cursor-not-allowed disabled:text-[#555D6C]">{busy ? <Loader2 className="h-4 w-4 animate-spin"/> : available ? <Link2 className="h-4 w-4"/> : <Clock3 className="h-4 w-4"/>}{available ? "Connecter" : "Non activé"}<ChevronRight className="ml-auto h-4 w-4"/></button>
          </article>;
        })}
        <a href="/app/journal" className="flex min-h-44 flex-col rounded-2xl border border-dashed border-[#4F8CFF]/20 bg-[#4F8CFF]/[0.025] p-4 transition-colors hover:border-[#4F8CFF]/40">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#4F8CFF]/10 text-[#8FB4FF]"><FileUp className="h-5 w-5"/></span><h3 className="mt-4 text-sm font-semibold">Import de fichier</h3><p className="mt-1 flex-1 text-xs leading-relaxed text-[#7E8798]">Solution de repli disponible pour CSV et exports de plateformes non autorisées.</p><span className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-[#8FB4FF]">Ouvrir l’import <ChevronRight className="ml-auto h-4 w-4"/></span>
        </a>
      </div>
    </section>

    {!compact && !loading && connections.length > 0 && <section className="card-elev overflow-hidden"><div className="border-b border-white/[0.06] p-5 sm:p-6"><h2 className="font-semibold">Sources autorisées</h2><p className="mt-1 text-xs text-[#737C8D]">La dernière synchronisation et les erreurs restent visibles compte par compte.</p></div><div className="grid gap-3 p-5 sm:p-6">{connections.map(connection => <ConnectionCard key={connection.id} connection={connection} busyId={actionId} onChoose={() => openSelection(connection.id)} onSync={syncAccount} onFinalize={() => finalizeMetaApi(connection)} onReconnect={() => launchProvider(PROVIDERS.find(item => item.id === connection.provider))} onDisconnect={() => disconnect(connection)}/>)}</div></section>}

    <Dialog open={Boolean(formProvider)} onOpenChange={open => { if (!open) { setFormProvider(null); setConfiguration(null); setMetaForm(EMPTY_META); setTlForm(EMPTY_TL); } }}>
      <DialogContent className="max-h-[92vh] overflow-y-auto border-white/[0.1] bg-[#090B13] text-white sm:max-w-xl">
        <DialogHeader><DialogTitle>{formProvider === "metaapi" ? "Connecter MetaTrader via MetaApi" : "Connecter TradeLocker"}</DialogTitle><DialogDescription className="text-[#8B93A3]">{formProvider === "metaapi" ? "Le lien officiel termine la configuration chez MetaApi. Un mot de passe éventuellement saisi est transmis à MetaApi puis immédiatement oublié par PipsEvo." : "Le mot de passe est échangé contre des jetons TradeLocker puis supprimé du formulaire et jamais stocké."}</DialogDescription></DialogHeader>
        {configuration ? <ConfigurationStep configuration={configuration} busy={actionId === configuration.connection.id} onFinalize={finalizeMetaApi}/> : <ProviderForm provider={formProvider} metaForm={metaForm} setMetaForm={setMetaForm} tlForm={tlForm} setTlForm={setTlForm} busy={actionId === formProvider} onSubmit={submitCredentials}/>}
      </DialogContent>
    </Dialog>

    <Dialog open={Boolean(selectConnection)} onOpenChange={open => { if (!open) setSelectConnection(null); }}>
      <DialogContent className="max-h-[92vh] overflow-y-auto border-white/[0.1] bg-[#090B13] text-white sm:max-w-xl">
        <DialogHeader><DialogTitle>Choisir les comptes à synchroniser</DialogTitle><DialogDescription className="text-[#8B93A3]">Seuls les comptes cochés seront importés automatiquement.</DialogDescription></DialogHeader>
        <div className="space-y-2">{(selectConnection?.integration_accounts || []).map(account => { const checked = selectedIds.includes(account.external_account_id); return <label key={account.external_account_id} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 ${checked ? "border-[#7C4DFF]/45 bg-[#7C4DFF]/[0.08]" : "border-white/[0.08] bg-[#0D1020]"}`}><input type="checkbox" checked={checked} onChange={() => setSelectedIds(current => checked ? current.filter(id => id !== account.external_account_id) : [...current, account.external_account_id])} className="h-4 w-4 accent-[#7C4DFF]"/><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{account.account_name || account.display_name || `Compte ${account.external_account_id.slice(-4)}`}</span><span className="mt-0.5 block text-[10px] text-[#737C8D]">{[account.broker_name, account.server_name, account.account_number_masked, account.currency].filter(Boolean).join(" · ")}</span></span>{checked && <CheckCircle2 className="h-4 w-4 text-[#00E676]"/>}</label>; })}</div>
        <DialogFooter><button onClick={() => setSelectConnection(null)} className="btn-ghost">Plus tard</button><button onClick={saveSelection} disabled={!selectedIds.length || actionId === selectConnection?.id} className="btn-primary inline-flex items-center justify-center gap-2 disabled:opacity-50">{actionId === selectConnection?.id && <Loader2 className="h-4 w-4 animate-spin"/>}Importer les comptes</button></DialogFooter>
      </DialogContent>
    </Dialog>
  </div>;
}

function ProviderForm({ provider, metaForm, setMetaForm, tlForm, setTlForm, busy, onSubmit }) {
  const meta = provider === "metaapi";
  const form = meta ? metaForm : tlForm;
  const setForm = meta ? setMetaForm : setTlForm;
  const field = (key, value) => setForm(current => ({ ...current, [key]: value }));
  return <form onSubmit={onSubmit} className="space-y-4">
    {meta ? <><div className="grid gap-3 sm:grid-cols-2"><Field label="Plateforme"><select value={form.platform} onChange={e => field("platform", e.target.value)} className="field"><option value="mt5">MetaTrader 5</option><option value="mt4">MetaTrader 4</option></select></Field><Field label="Nom dans PipsEvo"><input required maxLength={100} value={form.name} onChange={e => field("name", e.target.value)} className="field"/></Field></div><Field label="Numéro de compte"><input required inputMode="numeric" value={form.login} onChange={e => field("login", e.target.value)} className="field"/></Field><Field label="Serveur exact"><input required value={form.server} onChange={e => field("server", e.target.value)} className="field"/></Field><Field label="Mot de passe investisseur"><input required type="password" autoComplete="new-password" value={form.password} onChange={e => field("password", e.target.value)} className="field"/></Field><p className="text-[11px] leading-relaxed text-[#737C8D]">Utilise de préférence le mot de passe investisseur : PipsEvo importe les données en lecture seule et ne conserve pas ce mot de passe.</p></> : <><Field label="Environnement"><select value={form.environment} onChange={e => field("environment", e.target.value)} className="field"><option value="demo">Démo</option><option value="live">Réel</option></select></Field><Field label="Email TradeLocker"><input type="email" autoComplete="username" required value={form.email} onChange={e => field("email", e.target.value)} className="field"/></Field><Field label="Serveur"><input required value={form.server} onChange={e => field("server", e.target.value)} className="field"/></Field><Field label="Mot de passe"><input type="password" autoComplete="current-password" required value={form.password} onChange={e => field("password", e.target.value)} className="field"/></Field></>}
    <DialogFooter><button disabled={busy} className="btn-primary inline-flex items-center justify-center gap-2 disabled:opacity-50">{busy ? <Loader2 className="h-4 w-4 animate-spin"/> : <Server className="h-4 w-4"/>}{meta ? "Connecter MetaTrader" : "Autoriser TradeLocker"}</button></DialogFooter>
  </form>;
}
function Field({ label, children }) { return <label className="block text-xs text-[#9CA3AF]">{label}{React.cloneElement(children, { className: `${children.props.className || ""} mt-2 w-full rounded-xl border border-white/10 bg-[#0D1020] px-4 py-3 text-white outline-none focus:border-[#7C4DFF]` })}</label>; }
function ConfigurationStep({ configuration, busy, onFinalize }) { return <div className="space-y-4"><div className="rounded-2xl border border-[#4F8CFF]/20 bg-[#4F8CFF]/[0.05] p-4"><div className="font-medium text-[#9DBDFF]">1. Termine la configuration MetaApi</div><p className="mt-2 text-xs leading-relaxed text-[#8B93A3]">Le lien s’ouvre chez le fournisseur. Reviens ici quand le compte y apparaît comme connecté.</p><a href={configuration.configuration_link} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-xs text-[#B69CFF]">Rouvrir MetaApi <ExternalLink className="h-4 w-4"/></a></div><button onClick={() => onFinalize()} disabled={busy} className="btn-primary inline-flex w-full items-center justify-center gap-2 disabled:opacity-50">{busy ? <Loader2 className="h-4 w-4 animate-spin"/> : <CheckCircle2 className="h-4 w-4"/>}J’ai terminé la configuration</button></div>; }

function ConnectionCard({ connection, busyId, onChoose, onSync, onFinalize, onReconnect, onDisconnect }) {
  const [label, color] = statusCopy[connection.connection_status] || statusCopy.pending;
  const accounts = connection.integration_accounts || [];
  const needsReconnect = ["disconnected", "expired", "error"].includes(connection.connection_status);
  return <article className="rounded-2xl border border-white/[0.07] bg-[#0B0E18] p-4"><div className="flex flex-col gap-4 lg:flex-row lg:items-start"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="font-medium">{PROVIDERS.find(item => item.id === connection.provider)?.name || connection.provider}</span><span className={`text-[10px] ${color}`}>● {label}</span><span className="rounded border border-white/[0.08] px-1.5 py-0.5 text-[9px] uppercase text-[#697284]">lecture seule</span></div><p className="mt-1 text-xs text-[#737C8D]">{accounts.length} compte{accounts.length > 1 ? "s" : ""} détecté{accounts.length > 1 ? "s" : ""}</p><div className="mt-3 grid gap-2">{accounts.filter(account => ["selected", "connected", "error", "syncing"].includes(account.status)).map(account => <div key={account.id} className="flex flex-col gap-2 rounded-xl border border-white/[0.05] bg-black/10 p-3 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><div className="truncate text-xs font-medium">{account.account_name || `Compte ${account.external_account_id.slice(-4)}`}</div><div className="mt-1 text-[10px] text-[#5F6878]">Dernière synchro : {account.last_successful_sync_at ? new Date(account.last_successful_sync_at).toLocaleString("fr-FR") : "jamais"}</div>{account.last_error_message && <div className="mt-1 text-[10px] text-[#FF8999]">{account.last_error_message}</div>}</div><button onClick={() => onSync(account)} disabled={busyId === account.id || account.status === "syncing" || needsReconnect} className="btn-ghost inline-flex items-center justify-center gap-2 text-xs disabled:opacity-40">{busyId === account.id || account.status === "syncing" ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : <RefreshCw className="h-3.5 w-3.5"/>}Synchroniser</button></div>)}</div></div><div className="flex flex-col gap-2 sm:flex-row">{connection.connection_status === "pending" && connection.provider === "metaapi" ? <button onClick={onFinalize} className="btn-primary">Finaliser</button> : needsReconnect ? <button onClick={onReconnect} className="btn-primary inline-flex items-center justify-center gap-2"><RefreshCw className="h-4 w-4"/>Reconnecter</button> : <button onClick={onChoose} disabled={!accounts.length} className="btn-ghost disabled:opacity-40">Choisir les comptes</button>}<button onClick={onDisconnect} disabled={busyId === connection.id || connection.connection_status === "disconnected"} className="btn-ghost inline-flex items-center justify-center gap-2 text-[#FF8999] disabled:opacity-40"><Unplug className="h-4 w-4"/>Déconnecter</button></div></div></article>;
}
