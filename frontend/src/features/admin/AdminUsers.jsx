import React, { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { adminApi, isSuperAdmin } from "./api";
import { useAdminSession } from "./AdminAccess";
import { Empty, LoadState, Metric, Page, Pagination, RefreshButton, Status, confirmAction, extractError, formatDate, useAdminData } from "./ui";

const money = (value) => value == null ? "—" : new Intl.NumberFormat("fr-FR", { style: "currency", currency: "USD" }).format(Number(value));

export function AdminUsers() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [plan, setPlan] = useState("");
  const state = useAdminData(() => adminApi.users({ page, per_page: 25, search, role: role || undefined, status: status || undefined, plan: plan || undefined }), [page, search, role, status, plan]);
  return <Page eyebrow="COMPTES" title="Utilisateurs" description="Profils, accès et progression. Les mots de passe et jetons ne sont jamais exposés." actions={<RefreshButton onClick={state.reload} />}>
    <div className="admin-filters"><input type="search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Nom, e-mail ou UUID…" /><select value={role} onChange={(event) => { setRole(event.target.value); setPage(1); }}><option value="">Tous les rôles</option><option value="user">Utilisateur</option><option value="support">Support</option><option value="admin">Admin</option><option value="super_admin">Super admin</option></select><select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="">Tous les statuts</option><option value="active">Actifs</option><option value="suspended">Suspendus</option></select><select value={plan} onChange={(event) => { setPlan(event.target.value); setPage(1); }}><option value="">Tous les plans</option><option value="free">Free</option><option value="essential">Essential</option><option value="pro">Pro</option></select></div>
    <LoadState {...state} />
    {state.data && <div className="admin-panel table-panel">{state.data.items.length ? <div className="admin-table-wrap"><table><thead><tr><th>Utilisateur</th><th>Rôle</th><th>Statut</th><th>Plan</th><th>Comptes</th><th>Trades</th><th>Dernière activité</th></tr></thead><tbody>{state.data.items.map((item) => <tr key={item.id}><td><Link to={`/admin/users/${item.id}`}><strong>{item.name || "Sans nom"}</strong><small>{item.email}</small></Link></td><td><Status value={item.role} /></td><td><Status value={item.status} /></td><td>{item.plan || "free"}</td><td>{item.accounts_count}</td><td>{item.trades_count}</td><td>{formatDate(item.last_activity_at)}</td></tr>)}</tbody></table></div> : <Empty /> }<Pagination page={page} pages={state.data.pages} onChange={setPage} /></div>}
  </Page>;
}

export function AdminUserDetail() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const session = useAdminSession();
  const state = useAdminData(() => adminApi.user(userId), [userId]);
  const [busy, setBusy] = useState(false);
  const run = async (action) => {
    const messages = { suspend: "Suspendre immédiatement ce compte ?", reactivate: "Réactiver ce compte ?", reset_onboarding: "Réinitialiser l’onboarding ?", resend_confirmation: "Renvoyer l’e-mail de confirmation ?" };
    if (!confirmAction(messages[action])) return;
    setBusy(true);
    try { await adminApi.userAction(userId, action); toast.success("Action appliquée et auditée."); await state.reload(); }
    catch (error) { toast.error(extractError(error)); } finally { setBusy(false); }
  };
  const changeRole = async (role) => {
    if (!confirmAction(`Attribuer le rôle « ${role} » à cet utilisateur ?`)) return;
    setBusy(true);
    try { await adminApi.userRole(userId, role); toast.success("Rôle mis à jour."); await state.reload(); }
    catch (error) { toast.error(extractError(error)); } finally { setBusy(false); }
  };
  const retrySync = async (connectionId) => {
    if (!confirmAction("Relancer la lecture des comptes déjà autorisés par cet utilisateur ? Aucun ordre ne sera passé et aucun compte supplémentaire ne sera sélectionné.")) return;
    setBusy(true);
    try { const result = await adminApi.retryUserSync(userId, connectionId); if (result.data.partial_error) toast.warning("Une partie de l’historique reste à synchroniser."); else toast.success("Synchronisation terminée. Consulte les résultats."); await state.reload(); }
    catch (error) { toast.error(extractError(error)); } finally { setBusy(false); }
  };
  const data = state.data;
  return <Page eyebrow="UTILISATEUR" title={data?.identity?.name || "Fiche utilisateur"} description={data?.identity?.email} actions={<><button className="admin-button secondary" onClick={() => navigate(-1)}>Retour</button>{isSuperAdmin(session) && data?.trading?.connections?.filter((item) => item.provider === "tradelocker" && item.connection_status !== "disconnected").map((item) => <button key={item.id} className="admin-button secondary" disabled={busy} onClick={() => retrySync(item.id)}>{busy ? "Synchronisation…" : `Synchroniser TradeLocker ${item.account_number_masked || ""}`}</button>)}<RefreshButton onClick={state.reload} /></>}>
    <LoadState {...state} />
    {data && <>
      <section className="admin-metrics"><Metric label="Comptes" value={data.trading.accounts.length} /><Metric label="Trades" value={data.trading.trades_count} tone="green" /><Metric label="Exécutions" value={data.trading.executions_count ?? 0} /><Metric label="Win rate" value={data.trading_data.win_rate_percent == null ? "—" : `${data.trading_data.win_rate_percent}%`} tone="blue" /><Metric label="P&L net" value={money(data.trading_data.net_pnl)} tone={data.trading_data.net_pnl == null ? undefined : Number(data.trading_data.net_pnl) < 0 ? "red" : "green"} /></section>
      <section className="admin-grid two"><article className="admin-panel"><div className="admin-panel-head"><div><span>IDENTITÉ</span><h2>Accès au compte</h2></div><Status value={data.identity.status} /></div><dl className="admin-details"><div><dt>UUID</dt><dd>{data.identity.id}</dd></div><div><dt>Rôle</dt><dd><Status value={data.identity.role} /></dd></div><div><dt>E-mail confirmé</dt><dd>{data.identity.email_verified ? "Oui" : "Non"}</dd></div><div><dt>Inscription</dt><dd>{formatDate(data.identity.created_at)}</dd></div><div><dt>Dernière connexion</dt><dd>{formatDate(data.identity.last_sign_in_at)}</dd></div><div><dt>Onboarding</dt><dd>{data.identity.onboarding_completed ? "Terminé" : "À terminer"}</dd></div></dl></article><article className="admin-panel"><div className="admin-panel-head"><div><span>ACTIONS</span><h2>Administration du compte</h2></div></div><div className="admin-actions-stack">{data.identity.status === "active" ? <button className="admin-button danger" disabled={busy} onClick={() => run("suspend")}>Suspendre le compte</button> : <button className="admin-button success" disabled={busy} onClick={() => run("reactivate")}>Réactiver le compte</button>}<button className="admin-button secondary" disabled={busy} onClick={() => run("resend_confirmation")}>Renvoyer la confirmation</button><button className="admin-button secondary" disabled={busy} onClick={() => run("reset_onboarding")}>Réinitialiser l’onboarding</button>{isSuperAdmin(session) && <label>Rôle<select value={data.identity.role} disabled={busy || data.identity.id === session.id} onChange={(event) => changeRole(event.target.value)}><option value="user">Utilisateur</option><option value="support">Support</option><option value="admin">Admin</option><option value="super_admin">Super admin</option></select></label>}</div></article></section>
      <section className="admin-grid two"><article className="admin-panel"><div className="admin-panel-head"><div><span>ABONNEMENT</span><h2>État commercial</h2></div><Status value={data.subscription?.status || "inactive"} /></div><dl className="admin-details"><div><dt>Plan</dt><dd>{data.subscription?.plan || "free"}</dd></div><div><dt>Activation</dt><dd>{formatDate(data.subscription?.subscription_started_at || data.subscription?.created_at)}</dd></div><div><dt>Renouvellement</dt><dd>{formatDate(data.subscription?.current_period_end)}</dd></div><div><dt>Annulation</dt><dd>{data.subscription?.cancel_at_period_end ? "Programmée" : "Non"}</dd></div><div><dt>ID fournisseur</dt><dd>{data.subscription?.provider_subscription_id || "—"}</dd></div></dl></article><article className="admin-panel"><div className="admin-panel-head"><div><span>PERFORMANCE</span><h2>Résumé trading</h2></div></div><dl className="admin-details"><div><dt>Gain moyen</dt><dd>{money(data.trading_data.average_win)}</dd></div><div><dt>Perte moyenne</dt><dd>{money(data.trading_data.average_loss)}</dd></div><div><dt>Profit factor</dt><dd>{data.trading_data.profit_factor ?? "—"}</dd></div><div><dt>Meilleur jour</dt><dd>{data.trading_data.best_day?.[0] || "—"} · {money(data.trading_data.best_day?.[1])}</dd></div><div><dt>Pire jour</dt><dd>{data.trading_data.worst_day?.[0] || "—"} · {money(data.trading_data.worst_day?.[1])}</dd></div></dl></article></section>
      <section className="admin-panel"><div className="admin-panel-head"><div><span>TRADING</span><h2>Comptes suivis</h2></div></div>{data.trading.accounts.length ? <div className="admin-table-wrap"><table><thead><tr><th>Nom</th><th>Prop firm</th><th>Marché</th><th>Statut</th><th>Créé</th></tr></thead><tbody>{data.trading.accounts.map((item) => <tr key={item.id}><td>{item.name}</td><td>{item.firm}</td><td>{item.market_type}</td><td><Status value={item.status} /></td><td>{formatDate(item.created_at)}</td></tr>)}</tbody></table></div> : <Empty />}</section>
      <section className="admin-panel"><div className="admin-panel-head"><div><span>CONNEXIONS</span><h2>Plateformes connectées</h2></div></div>{data.trading.connections.length ? <div className="admin-table-wrap"><table><thead><tr><th>Fournisseur</th><th>Plateforme</th><th>Compte</th><th>Connexion</th><th>Dernière synchro</th><th>Trades uniques</th><th>Exécutions</th><th>Erreur</th></tr></thead><tbody>{data.trading.connections.map((item) => <tr key={item.id}><td>{item.provider}</td><td>{item.platform}</td><td>{item.broker_name || "—"}<small>{item.account_number_masked}</small></td><td><Status value={item.connection_status} /></td><td>{formatDate(item.last_successful_sync_at)}</td><td>{item.trades_imported}</td><td>{item.executions_imported ?? 0}</td><td>{item.last_error_code || "—"}</td></tr>)}</tbody></table></div> : <Empty />}</section>
      <section className="admin-panel"><div className="admin-panel-head"><div><span>JOURNAL</span><h2>Dernières entrées</h2></div></div>{data.journal.recent.length ? <div className="admin-table-wrap"><table><thead><tr><th>Date</th><th>Actif</th><th>P&L</th><th>Setup</th><th>Captures</th></tr></thead><tbody>{data.journal.recent.map((item) => <tr key={item.id}><td>{item.date}</td><td>{item.instrument}</td><td>{money(item.pnl)}</td><td>{item.setup || "—"}</td><td>{item.screenshots_count}</td></tr>)}</tbody></table></div> : <Empty />}</section>
    </>}
  </Page>;
}
