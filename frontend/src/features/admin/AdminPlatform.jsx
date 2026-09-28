import React, { useState } from "react";
import { Link } from "react-router-dom";
import { adminApi } from "./api";
import { Empty, LoadState, Page, Pagination, RefreshButton, Status, formatDate, formatNumber, useAdminData } from "./ui";

export function AdminTradingAccounts() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [provider, setProvider] = useState("");
  const [status, setStatus] = useState("");
  const state = useAdminData(() => adminApi.tradingAccounts({ page, per_page: 25, search, provider: provider || undefined, status: status || undefined }), [page, search, provider, status]);
  const update = (setter) => (event) => { setter(event.target.value); setPage(1); };
  return <Page eyebrow="TRADING" title="Comptes de trading" description="Comptes réellement détectés par les connecteurs. Aucun identifiant brut ni secret n’est exposé." actions={<RefreshButton onClick={state.reload} />}>
    <div className="admin-filters"><input type="search" value={search} onChange={update(setSearch)} placeholder="Compte, broker ou serveur…" /><select value={provider} onChange={update(setProvider)}><option value="">Tous les fournisseurs</option><option value="metaapi">MetaApi</option><option value="ctrader">cTrader</option><option value="tradelocker">TradeLocker</option><option value="tradovate">Tradovate</option></select><select value={status} onChange={update(setStatus)}><option value="">Tous les statuts</option><option value="connected">Connecté</option><option value="syncing">Synchronisation</option><option value="error">Erreur</option><option value="disconnected">Déconnecté</option></select></div>
    <LoadState {...state} />
    {state.data && <div className="admin-panel table-panel">{state.data.items.length ? <div className="admin-table-wrap"><table><thead><tr><th>Utilisateur</th><th>Fournisseur</th><th>Compte</th><th>Statut</th><th>Dernière synchro</th><th>Trades importés</th><th>Dernière erreur</th></tr></thead><tbody>{state.data.items.map((item) => <tr key={item.id}><td><Link to={`/admin/users/${item.user.id}`}><strong>{item.user.name || "Sans nom"}</strong><small>{item.user.email || item.user.id}</small></Link></td><td><strong>{item.provider}</strong><small>{item.platform}</small></td><td>{item.account_name || item.broker_name || "—"}<small>{item.account_number_masked || item.server_name}</small></td><td><Status value={item.status} /></td><td>{formatDate(item.last_successful_sync_at)}</td><td>{formatNumber(item.trades_imported)}</td><td>{item.last_error_code || "—"}<small>{item.last_error_message}</small></td></tr>)}</tbody></table></div> : <Empty />}<Pagination page={page} pages={state.data.pages} onChange={setPage} /></div>}
  </Page>;
}

export function AdminIntegrations() {
  const [days, setDays] = useState(30);
  const state = useAdminData(() => adminApi.integrations(days), [days]);
  return <Page eyebrow="CONNECTEURS" title="Intégrations" description="État consolidé des connexions, comptes et synchronisations enregistrés par PipsEvo." actions={<><select value={days} onChange={(event) => setDays(Number(event.target.value))}><option value="7">7 jours</option><option value="30">30 jours</option><option value="90">90 jours</option></select><RefreshButton onClick={state.reload} /></>}>
    <div className="admin-filters admin-shortcuts"><Link className="admin-button secondary" to="/admin/trading-sync">Synchronisations</Link><Link className="admin-button secondary" to="/admin/prop-firms">Prop firms</Link><Link className="admin-button secondary" to="/admin/emails">E-mails</Link><Link className="admin-button secondary" to="/admin/atlas">Atlas IA</Link><Link className="admin-button secondary" to="/admin/backtesting">Backtest Lab</Link></div>
    <LoadState {...state} />
    {state.data && <><section className="admin-cards">{state.data.items.map((item) => <article className="admin-panel integration-card" key={item.provider}><div className="admin-panel-head"><div><span>FOURNISSEUR</span><h2>{item.provider}</h2></div><Status value={item.connected ? "active" : "inactive"} /></div><div className="admin-health"><div><span>Connexions</span><strong>{item.connected}/{item.connections}</strong></div><div><span>Comptes</span><strong>{item.accounts}</strong></div><div><span>Synchros réussies</span><strong>{item.sync_success}</strong></div><div><span>Taux d’erreur</span><strong>{item.error_rate == null ? "—" : `${item.error_rate}%`}</strong></div></div><p className="admin-note">{item.platforms.join(", ") || "Plateforme non renseignée"} · Dernier succès {formatDate(item.last_successful_sync_at)}</p></article>)}</section>{!state.data.items.length && <Empty />}
      <section className="admin-panel table-panel"><div className="admin-panel-head admin-panel-padded"><div><span>ERREURS RÉCENTES</span><h2>Synchronisations à contrôler</h2></div><Link className="admin-button secondary" to="/admin/trading-sync">Voir les synchronisations</Link></div>{state.data.recent_errors.length ? <div className="admin-table-wrap"><table><thead><tr><th>Connexion</th><th>Statut</th><th>Code</th><th>Message</th><th>Date</th></tr></thead><tbody>{state.data.recent_errors.map((item, index) => <tr key={`${item.connection_id}-${item.started_at}-${index}`}><td>{item.connection_id}</td><td><Status value={item.status} /></td><td>{item.error_code || "—"}</td><td>{item.error_message || "—"}</td><td>{formatDate(item.started_at)}</td></tr>)}</tbody></table></div> : <Empty />}</section>
    </>}
  </Page>;
}

export function AdminSystem() {
  const state = useAdminData(adminApi.system, []);
  return <Page eyebrow="INFRASTRUCTURE" title="Système" description="Configuration et erreurs connues. Un service configuré n’est jamais présenté comme sain sans preuve opérationnelle." actions={<RefreshButton onClick={state.reload} />}>
    <div className="admin-filters admin-shortcuts"><Link className="admin-button secondary" to="/admin/incidents">Gérer les incidents</Link><Link className="admin-button secondary" to="/admin/settings">Paramètres</Link></div>
    <LoadState {...state} />
    {state.data && <><section className="admin-cards system-cards">{state.data.services.map((service) => <article className="admin-panel" key={service.name}><div className="admin-panel-head"><div><span>SERVICE</span><h2>{service.name}</h2></div><Status value={service.status} /></div><p className="admin-note">{service.detail}</p></article>)}</section>
      <section className="admin-grid two"><article className="admin-panel"><div className="admin-panel-head"><div><span>INCIDENTS</span><h2>Incidents ouverts</h2></div><Status value={`${state.data.incidents.length} ouvert(s)`} /></div>{state.data.incidents.length ? <div className="admin-list">{state.data.incidents.map((item) => <article key={item.id}><div><strong>{item.source} · {item.error_code || item.severity}</strong><span>{item.message}</span><small>{formatDate(item.last_seen_at)} · {item.occurrences || 1} occurrence(s)</small></div><Status value={item.status} /></article>)}</div> : <Empty />}</article><article className="admin-panel"><div className="admin-panel-head"><div><span>JOBS</span><h2>Erreurs de synchronisation</h2></div><Status value={`${state.data.sync_errors.length} erreur(s)`} /></div>{state.data.sync_errors.length ? <div className="admin-list">{state.data.sync_errors.slice(0, 20).map((item, index) => <article key={`${item.connection_id}-${item.started_at}-${index}`}><div><strong>{item.error_code || item.status}</strong><span>{item.error_message || "Erreur sans message fournisseur"}</span><small>{formatDate(item.started_at)}</small></div></article>)}</div> : <Empty />}</article></section>
    </>}
  </Page>;
}
