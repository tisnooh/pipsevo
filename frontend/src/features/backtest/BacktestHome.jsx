import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FlaskConical, Plus, Upload, ArrowRight } from "lucide-react";
import { labApi, errorText, usd } from "./api";
import "./backtest.css";

export default function BacktestHome() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("sessions");
  const [creating, setCreating] = useState(false);
  const load = useCallback(async () => {
    try {
      const [catalog, datasets, sessions, strategies] = await Promise.all([labApi.catalog(), labApi.datasets(), labApi.sessions(), labApi.strategies()]);
      setData({ catalog, datasets, sessions, strategies }); setError("");
    } catch (e) { setError(errorText(e)); }
  }, []);
  useEffect(() => { load(); }, [load]);
  async function submit(event, task) {
    event.preventDefault(); setBusy(true); setError("");
    try { await task(new FormData(event.currentTarget)); await load(); }
    catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  }
  return <div className="bt-lab pe-page pe-page-stack mx-auto max-w-[1800px]">
    <header className="pe-page-header"><div><div className="pe-eyebrow">Entraînement historique</div><h1 className="pe-page-title mt-2 flex items-center gap-2"><FlaskConical className="text-[#B58BFF]"/>Backtest Lab</h1><p className="pe-page-copy mt-2">Rejoue le marché. Teste tes décisions. Garde les résultats réels séparés.</p></div><button className="btn-primary inline-flex items-center gap-2" onClick={() => { setCreating(v => !v); setTab("sessions"); }}><Plus size={16}/>Nouvelle session</button></header>
    <nav className="flex flex-wrap gap-2" aria-label="Backtest Lab">{[["sessions", "Sessions"], ["data", "Données historiques"], ["strategies", "Stratégies"]].map(([id, label]) => <button key={id} onClick={() => setTab(id)} className={`pe-control ${tab === id ? "border-[#B58BFF] text-[#B58BFF]" : ""}`} aria-current={tab === id ? "page" : undefined}>{label}</button>)}<Link className="pe-control" to="/app/backtest/projection">Projection statistique</Link></nav>
    {error && <div className="bt-error" role="alert">{error} <button className="underline" onClick={load}>Réessayer</button></div>}
    {!data && !error && <p role="status">Chargement du Lab…</p>}
    {data && <>
      {tab === "sessions" && <>
        {creating && <form className="pe-card pe-card-pad bt-form" onSubmit={e => submit(e, async f => {
          const dataset = data.datasets.find(d => d.id === f.get("dataset_id"));
          const start = f.get("start") ? Math.floor(new Date(`${f.get("start")}Z`).getTime() / 1000) : dataset.quality.first;
          const session = await labApi.create({ dataset_id: dataset.id, name: f.get("name"), start, capital: f.get("capital"), commission: f.get("commission"), slippage_ticks: Number(f.get("slippage_ticks")), strategy_id: f.get("strategy_id") || null, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone });
          navigate(`/app/backtest/session/${session.id}`);
        })}>
          <h2 className="text-lg font-semibold">Préparer une session</h2>
          {!data.datasets.length ? <p>Aucun historique disponible. <button type="button" className="text-[#B58BFF] underline" onClick={() => setTab("data")}>Importer des bougies</button></p> : <>
            <label>Nom<input name="name" required maxLength={80} defaultValue="Ma session de replay"/></label>
            <label>Historique<select name="dataset_id" required>{data.datasets.map(d => <option key={d.id} value={d.id}>{d.contract || d.symbol} · {d.source} · {new Date(d.quality.first * 1000).toISOString().slice(0, 10)}</option>)}</select></label>
            <div className="grid sm:grid-cols-2 gap-4"><label>Départ (UTC, vide = première bougie)<input type="datetime-local" name="start" step="60"/></label><label>Capital initial (USD)<input name="capital" type="number" defaultValue="10000" min="1" max="100000000" required/></label><label>Commission aller-retour / contrat ou lot (USD)<input name="commission" type="number" min="0" max="1000" step="0.01" defaultValue="0" required/></label><label>Slippage par exécution (ticks)<input name="slippage_ticks" type="number" min="0" max="100" defaultValue="1" required/></label></div>
            <label>Stratégie<select name="strategy_id"><option value="">Sans stratégie</option>{data.strategies.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
            <p className="bt-note">Compte de simulation en USD. Le départ correspond à la première bougie déjà clôturée. Les ordres au marché seront exécutés à l’ouverture suivante. Renseigne tes frais réels ; 0 signifie sans commission.</p>
            <button disabled={busy} className="btn-primary">Créer et ouvrir le replay</button>
          </>}
        </form>}
        {!data.sessions.length && <div className="pe-card pe-card-pad"><h2 className="text-lg font-semibold">Ton premier replay commence ici.</h2><p className="pe-page-copy mt-2">Importe un historique 1 minute, choisis le contrat et crée une session. Aucun cours fictif n’est ajouté.</p><button className="btn-secondary mt-4" onClick={() => setTab("data")}>Préparer les données</button></div>}
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{data.sessions.map(s => <Link key={s.id} to={`/app/backtest/session/${s.id}`} className="pe-card pe-card-pad hover:border-[#B58BFF]/50"><div className="flex justify-between gap-3"><h2 className="font-semibold">{s.name}</h2><ArrowRight size={18} className="text-[#B58BFF]"/></div><p className="mt-2 text-sm text-[#9CA3AF]">{s.dataset.contract || s.config.symbol} · {s.state.completed ? "Terminée" : "En cours"}</p><p className="mt-5 text-2xl font-numeric">{usd(s.state.equity)}</p><p className="bt-note mt-2">Curseur : {new Date((s.cursor + 60) * 1000).toLocaleString("fr-FR")} · sauvegardé</p></Link>)}</div>
      </>}
      {tab === "data" && <div className="grid xl:grid-cols-2 gap-5">
        <form className="pe-card pe-card-pad bt-form" onSubmit={e => submit(e, async f => { await labApi.upload(f); })}>
          <h2 className="text-lg font-semibold flex items-center gap-2"><Upload size={18}/>Importer un historique privé</h2>
          <label>Instrument<select name="symbol">{data.catalog.instruments.map(i => <option key={i.symbol}>{i.symbol}</option>)}</select></label>
          <label>Contrat daté (futures uniquement)<input name="contract" placeholder="NQH5, ESU6…" maxLength={16}/></label>
          <label>Source de l’historique<input name="source" required maxLength={120} placeholder="Fournisseur ou plateforme d’export"/></label>
          <label>CSV de bougies 1 minute<input type="file" name="file" accept=".csv,text/csv" required/></label>
          <p className="bt-note">UTF-8, virgules, dates ISO avec fuseau (ex. 2025-03-12T13:30:00Z). Colonnes : timestamp, open, high, low, close, volume (facultatif). Dates d’ouverture des bougies, dans l’ordre. Maximum 100 000 bougies / 16 Mo. Aucun ajustement de rollover automatique.</p>
          <label className="bt-check"><input name="rights_confirmed" value="true" type="checkbox" required/>Je dispose des droits nécessaires pour utiliser ce fichier dans mon espace privé.</label>
          <button className="btn-primary" disabled={busy}>{busy ? "Validation et import…" : "Valider l’historique"}</button>
        </form>
        <div className="space-y-4"><div className="pe-card pe-card-pad"><h2 className="font-semibold">Transparence des données</h2><p className="pe-page-copy mt-2">Import privé disponible. La connexion Databento n’est pas encore active : clé fournisseur et droits commerciaux à valider. Les paires JPY attendent un moteur de conversion historique vers USD.</p></div>{data.datasets.map(d => <div key={d.id} className="pe-card pe-card-pad"><h3 className="font-semibold">{d.contract || d.symbol} · {d.source}</h3><p className="text-sm mt-2">{d.quality.count.toLocaleString("fr-FR")} bougies · 1m · {d.quality.gaps} intervalles sans données</p><p className="bt-note mt-2">{new Date(d.quality.first * 1000).toISOString()} → {new Date(d.quality.last * 1000).toISOString()}</p><p className="bt-note mt-2">{d.quality.warning}</p></div>)}</div>
      </div>}
      {tab === "strategies" && <div className="grid lg:grid-cols-2 gap-5"><form className="pe-card pe-card-pad bt-form" onSubmit={e => submit(e, async f => { await labApi.createStrategy({ name: f.get("name"), description: f.get("description"), rules: f.get("rules").split("\n").map(v => v.trim()).filter(Boolean) }); e.target.reset(); })}><h2 className="font-semibold text-lg">Créer une stratégie</h2><label>Nom<input name="name" required maxLength={80}/></label><label>Description<textarea name="description" maxLength={2000}/></label><label>Check-list d’entrée (une règle par ligne)<textarea name="rules" rows={5} placeholder="Le contexte est défini&#10;Le risque respecte mon plan"/></label><p className="bt-note">La stratégie et ses règles sont figées dans chaque session pour conserver l’historique de tes décisions.</p><button className="btn-primary" disabled={busy}>Enregistrer la stratégie</button></form><div className="space-y-4">{data.strategies.map(s => <article key={s.id} className="pe-card pe-card-pad"><h3 className="font-semibold">{s.name}</h3><p className="pe-page-copy mt-2">{s.description}</p><ul className="mt-4 space-y-2 text-sm">{s.rules.map((r, i) => <li key={i}>✓ {r}</li>)}</ul></article>)}</div></div>}
    </>}
  </div>;
}
