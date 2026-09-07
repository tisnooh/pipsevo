import React, { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { adminApi, isSuperAdmin } from "./api";
import { useAdminSession } from "./AdminAccess";
import { Empty, LoadState, Metric, Page, Pagination, RefreshButton, Status, confirmAction, extractError, formatDate, useAdminData } from "./ui";

export function AdminUsers() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const state = useAdminData(() => adminApi.users({ page, per_page: 25, search, role: role || undefined }), [page, search, role]);
  return <Page eyebrow="COMPTES" title="Utilisateurs" description="Profils, accès et progression. Les mots de passe et jetons ne sont jamais exposés." actions={<RefreshButton onClick={state.reload} />}>
    <div className="admin-filters"><input type="search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Nom, e-mail ou UUID…" /><select value={role} onChange={(event) => { setRole(event.target.value); setPage(1); }}><option value="">Tous les rôles</option><option value="user">Utilisateur</option><option value="support">Support</option><option value="admin">Admin</option><option value="super_admin">Super admin</option></select></div>
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
  const data = state.data;
  return <Page eyebrow="UTILISATEUR" title={data?.identity?.name || "Fiche utilisateur"} description={data?.identity?.email} actions={<><button className="admin-button secondary" onClick={() => navigate(-1)}>Retour</button><RefreshButton onClick={state.reload} /></>}>
    <LoadState {...state} />
    {data && <>
      <section className="admin-metrics"><Metric label="Comptes" value={data.trading.accounts.length} /><Metric label="Trades" value={data.trading.trades_count} tone="green" /><Metric label="Backtests" value={data.backtest.sessions_count} tone="blue" /><Metric label="Analyses Atlas" value={data.atlas.requests_count} /></section>
      <section className="admin-grid two"><article className="admin-panel"><div className="admin-panel-head"><div><span>IDENTITÉ</span><h2>Accès au compte</h2></div><Status value={data.identity.status} /></div><dl className="admin-details"><div><dt>UUID</dt><dd>{data.identity.id}</dd></div><div><dt>Rôle</dt><dd><Status value={data.identity.role} /></dd></div><div><dt>E-mail confirmé</dt><dd>{data.identity.email_verified ? "Oui" : "Non"}</dd></div><div><dt>Inscription</dt><dd>{formatDate(data.identity.created_at)}</dd></div><div><dt>Dernière connexion</dt><dd>{formatDate(data.identity.last_sign_in_at)}</dd></div><div><dt>Onboarding</dt><dd>{data.identity.onboarding_completed ? "Terminé" : "À terminer"}</dd></div></dl></article><article className="admin-panel"><div className="admin-panel-head"><div><span>ACTIONS</span><h2>Administration du compte</h2></div></div><div className="admin-actions-stack">{data.identity.status === "active" ? <button className="admin-button danger" disabled={busy} onClick={() => run("suspend")}>Suspendre le compte</button> : <button className="admin-button success" disabled={busy} onClick={() => run("reactivate")}>Réactiver le compte</button>}<button className="admin-button secondary" disabled={busy} onClick={() => run("resend_confirmation")}>Renvoyer la confirmation</button><button className="admin-button secondary" disabled={busy} onClick={() => run("reset_onboarding")}>Réinitialiser l’onboarding</button>{isSuperAdmin(session) && <label>Rôle<select value={data.identity.role} disabled={busy || data.identity.id === session.id} onChange={(event) => changeRole(event.target.value)}><option value="user">Utilisateur</option><option value="support">Support</option><option value="admin">Admin</option><option value="super_admin">Super admin</option></select></label>}</div></article></section>
      <section className="admin-panel"><div className="admin-panel-head"><div><span>TRADING</span><h2>Comptes suivis</h2></div></div>{data.trading.accounts.length ? <div className="admin-table-wrap"><table><thead><tr><th>Nom</th><th>Prop firm</th><th>Marché</th><th>Statut</th><th>Créé</th></tr></thead><tbody>{data.trading.accounts.map((item) => <tr key={item.id}><td>{item.name}</td><td>{item.firm}</td><td>{item.market_type}</td><td><Status value={item.status} /></td><td>{formatDate(item.created_at)}</td></tr>)}</tbody></table></div> : <Empty />}</section>
    </>}
  </Page>;
}
