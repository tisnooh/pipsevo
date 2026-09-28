import React, { useState } from "react";
import { adminApi } from "./api";
import { Empty, LoadState, Metric, Page, RefreshButton, Status, formatNumber, useAdminData } from "./ui";

function MiniBars({ rows = [] }) {
  const max = Math.max(1, ...rows.map((row) => Number(row.value || 0)));
  return <div className="admin-chart" aria-label="Inscriptions par jour">{rows.map((row) => <div key={row.date} title={`${row.date}: ${row.value}`}><span style={{ height: `${Math.max(3, (Number(row.value || 0) / max) * 100)}%` }} /><small>{row.date.slice(5)}</small></div>)}</div>;
}

export default function AdminOverview() {
  const [days, setDays] = useState(30);
  const state = useAdminData(() => adminApi.overview(days), [days]);
  const data = state.data;
  return <Page eyebrow="PILOTAGE" title="Vue d’ensemble" description="Activité produit et santé opérationnelle, calculées uniquement à partir des données persistées." actions={<><select value={days} onChange={(event) => setDays(Number(event.target.value))}><option value="7">7 jours</option><option value="30">30 jours</option><option value="90">90 jours</option><option value="365">1 an</option><option value="3650">Tout</option></select><RefreshButton onClick={state.reload} /></>}>
    <LoadState {...state} />
    {data && <>
      <section className="admin-metrics"><Metric label="Utilisateurs" value={formatNumber(data.users.total)} hint={`+${data.users.today} aujourd’hui`} /><Metric label="Actifs 30 jours" value={formatNumber(data.activity.days_30)} hint={data.activity.tracking_rows_limited ? "Fenêtre tronquée à 10 000 événements" : "Événements produit"} tone="blue" /><Metric label="Trades" value={formatNumber(data.product.trades)} hint={`${formatNumber(data.product.accounts)} comptes`} tone="green" /><Metric label="Incidents ouverts" value={formatNumber(data.health.active_incidents)} hint={`${data.health.sync_failed} synchro(s) en erreur`} tone={data.health.active_incidents ? "red" : "green"} /></section>
      <section className="admin-grid two"><article className="admin-panel"><div className="admin-panel-head"><div><span>ACQUISITION</span><h2>Inscriptions</h2></div><Status value={`${days} jours`} /></div>{data.series.signups?.length ? <MiniBars rows={data.series.signups} /> : <Empty />}</article><article className="admin-panel"><div className="admin-panel-head"><div><span>EXPLOITATION</span><h2>Santé des services</h2></div></div><div className="admin-health"><div><span>Synchronisations réussies</span><strong>{formatNumber(data.health.sync_success)}</strong></div><div><span>Erreurs de synchronisation</span><strong>{formatNumber(data.health.sync_failed)}</strong></div><div><span>Erreurs e-mail</span><strong>{formatNumber(data.health.email_errors)}</strong></div><div><span>Erreurs Atlas</span><strong>{formatNumber(data.health.atlas_errors)}</strong></div><div><span>Backtests terminés</span><strong>{formatNumber(data.health.backtest_completed)}</strong></div><div><span>Tickets ouverts</span><strong>{formatNumber(data.product.support_open)}</strong></div></div></article></section>
      <section className="admin-panel"><div className="admin-panel-head"><div><span>FACTURATION</span><h2>Abonnements</h2></div><Status value={data.billing.configured ? "configurée" : "non configurée"} /></div>{data.billing.configured ? <div className="admin-health">{Object.entries(data.billing.plans || {}).map(([key, value]) => <div key={key}><span>{key}</span><strong>{value}</strong></div>)}</div> : <Empty>{data.billing.message}. Aucun revenu fictif n’est affiché.</Empty>}</section>
    </>}
  </Page>;
}
