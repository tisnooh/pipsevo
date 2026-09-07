import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Play, Pause, ChevronLeft, ChevronRight } from "lucide-react";
import { labApi, errorText, usd } from "./api";
import { mergeVisibleBars, TIMEFRAMES } from "./bars";
import ReplayChart from "./ReplayChart";
import OrderTicket from "./OrderTicket";
import "./backtest.css";

export default function BacktestSession() {
  const { sessionId } = useParams();
  const [session, setSession] = useState(null);
  const [bars, setBars] = useState([]);
  const [catalog, setCatalog] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [direction, setDirection] = useState("buy");
  const [tab, setTab] = useState("journal");
  const sessionRef = useRef(null), lock = useRef(false), generation = useRef(0);
  const update = useCallback(value => { sessionRef.current = value; setSession(value); }, []);
  const load = useCallback(async () => {
    const version = ++generation.current;
    setPlaying(false); setError("");
    try {
      const [s, c] = await Promise.all([labApi.session(sessionId), labApi.catalog()]);
      const visible = await labApi.bars(sessionId);
      if (version !== generation.current) return;
      update(s); setCatalog(c); setBars(mergeVisibleBars([], visible, s.cursor));
    } catch (e) { if (version === generation.current) setError(errorText(e)); }
  }, [sessionId, update]);
  useEffect(() => { load(); return () => { generation.current += 1; sessionRef.current = null; }; }, [load]);
  const send = useCallback(async (action, payload = {}) => {
    if (lock.current || !sessionRef.current) return;
    if (action !== "next") setPlaying(false);
    lock.current = true; setBusy(true); setError("");
    const version = generation.current;
    try {
      const previous = sessionRef.current;
      const result = await labApi.command(sessionId, previous.revision, action, payload);
      if (version !== generation.current) return;
      update(result.session);
      setBars(old => mergeVisibleBars(old, result.bars, result.session.cursor));
      if (action === "previous") {
        const visible = await labApi.bars(sessionId);
        if (version === generation.current) setBars(mergeVisibleBars([], visible, result.session.cursor));
      }
      if (result.session.cursor >= result.session.dataset.quality.last || result.session.state.completed ||
          result.session.state.trades.length !== previous.state.trades.length ||
          Boolean(result.session.state.position) !== Boolean(previous.state.position) ||
          result.session.state.orders.some((o, i) => o.status !== previous.state.orders[i]?.status)) setPlaying(false);
    } catch (e) { if (version === generation.current) { setError(`${errorText(e)} Si la réponse a été perdue, recharge la session avant de réessayer.`); setPlaying(false); } }
    finally { lock.current = false; setBusy(false); }
  }, [sessionId, update]);

  useEffect(() => {
    if (!playing) return undefined;
    const timer = window.setInterval(() => send("next"), 1000 / speed);
    return () => window.clearInterval(timer);
  }, [playing, speed, send]);
  useEffect(() => {
    const keyboard = e => {
      if (e.target.closest("input,select,textarea,button,a,[contenteditable=true]") || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.code === "Space") { e.preventDefault(); if (!sessionRef.current?.state.completed) setPlaying(v => !v); }
      if (e.code === "ArrowRight") { e.preventDefault(); send("next"); }
      if (e.key.toLowerCase() === "b") { setPlaying(false); setDirection("buy"); }
      if (e.key.toLowerCase() === "s") { setPlaying(false); setDirection("sell"); }
      if (e.key === "Escape") setPlaying(false);
    };
    const visibility = () => { if (document.hidden) setPlaying(false); };
    window.addEventListener("keydown", keyboard); document.addEventListener("visibilitychange", visibility);
    return () => { window.removeEventListener("keydown", keyboard); document.removeEventListener("visibilitychange", visibility); };
  }, [send]);

  if (!session || !catalog) return <div className="pe-page"><Link to="/app/backtest" className="text-[#B58BFF]">← Backtest Lab</Link>{error ? <p role="alert" className="bt-error mt-4">{error} <button onClick={load}>Réessayer</button></p> : <p role="status" className="mt-4">Chargement de la session…</p>}</div>;
  const { state, config, settings, analytics } = session;
  const instrument = catalog.instruments.find(i => i.symbol === config.symbol);
  const pending = state.orders.filter(o => o.status === "pending");
  const ended = session.cursor >= session.dataset.quality.last;
  const chartProps = { bars, cursor: session.cursor, timezone: settings.timezone, position: state.position, tickSize: instrument.tick_size };
  return <div className="bt-lab pe-page pe-page-stack mx-auto max-w-[1900px]">
    <header className="pe-page-header"><div><Link to="/app/backtest" className="text-sm text-[#B58BFF]">← Toutes les sessions</Link><h1 className="pe-page-title mt-2">{session.name}</h1><p className="pe-page-copy mt-1">{session.dataset.contract || config.symbol} · {session.dataset.source} · Simulation, pas un compte réel</p></div><span className="bt-note" role="status">{busy ? "Sauvegarde…" : `Sauvegardé · révision ${session.revision}`}</span></header>
    {error && <div className="bt-error" role="alert">{error} <button onClick={load} className="underline">Recharger</button></div>}
    <section className="grid grid-cols-2 lg:grid-cols-5 gap-3" aria-label="Résultats de la session">{[["Solde", usd(state.balance)], ["Équité", usd(state.equity)], ["P&L clôturé", usd(analytics.net)], ["Trades clôturés", analytics.trades], ["Drawdown d’équité max", usd(state.max_drawdown)]].map(([label, value]) => <div className="pe-card p-4" key={label}><div className="bt-note">{label}</div><div className="font-numeric text-xl font-semibold mt-2">{value}</div></div>)}</section>
    <div className="bt-workspace"><section className="min-w-0 space-y-3">
      <div className="pe-card px-4 py-3 bt-form bt-toolbar">
        <label>Graphique principal<select disabled={busy} value={settings.timeframe} onChange={e => send("settings", { ...settings, timeframe: e.target.value })}>{Object.keys(TIMEFRAMES).map(t => <option key={t}>{t}</option>)}</select></label>
        <label className="bt-check"><input type="checkbox" checked={settings.dual} disabled={busy} onChange={e => send("settings", { ...settings, dual: e.target.checked })}/>Deux graphiques</label>
        {settings.dual && <label>Secondaire<select disabled={busy} value={settings.secondary} onChange={e => send("settings", { ...settings, secondary: e.target.value })}>{Object.keys(TIMEFRAMES).map(t => <option key={t}>{t}</option>)}</select></label>}
        <span className="bt-note">{new Date(session.currentReplayTimestamp * 1000).toLocaleString("fr-FR", { timeZone: settings.timezone })} · {settings.timezone}</span>
      </div>
      <div className={settings.dual ? "grid 2xl:grid-cols-2 gap-3" : ""}><ReplayChart {...chartProps} timeframe={settings.timeframe}/>{settings.dual && <ReplayChart {...chartProps} timeframe={settings.secondary}/>}</div>
      <button className="text-xs text-[#B58BFF] underline" disabled={busy || bars.length >= 10000} onClick={async () => { setPlaying(false); try { const earlier = await labApi.bars(sessionId, bars[0].timestamp - 1); setBars(old => mergeVisibleBars(earlier, old, sessionRef.current.cursor)); } catch (e) { setError(errorText(e)); } }}>Charger l’historique antérieur (jusqu’à 10 000 bougies en mémoire)</button>
      <div className="bt-replay pe-card px-4 py-3 flex flex-wrap items-center gap-2" role="group" aria-label="Contrôles du replay">
        <button className="pe-icon-button" aria-label="Bougie précédente" disabled={busy || state.orders.length > 0 || state.completed} onClick={() => send("previous")}><ChevronLeft size={18}/></button>
        <button className="btn-primary flex items-center gap-2" disabled={state.completed || ended} onClick={() => setPlaying(v => !v)}>{playing ? <Pause size={16}/> : <Play size={16}/>}{playing ? "Pause" : "Lecture"}</button>
        <button className="pe-icon-button" aria-label="Bougie suivante" disabled={busy || state.completed || ended} onClick={() => { setPlaying(false); send("next"); }}><ChevronRight size={18}/></button>
        <label className="text-xs">Vitesse <select className="pe-control" value={speed} onChange={e => setSpeed(Number(e.target.value))}>{[1, 2, 5, 10, 25].map(v => <option key={v} value={v}>{v}×</option>)}</select></label>
        <span className="bt-note ml-auto">{state.completed ? "Session terminée" : ended ? "Fin de l’historique" : playing ? "Lecture · pause sur exécution" : "En pause"}</span>
      </div>
      <p className="bt-note">Espace : lecture/pause · → : une minute · B/S : préparer un achat/une vente · Échap : pause. Vitesse limitée par la sauvegarde serveur. Les deux graphiques partagent le même instant, sans accès aux bougies futures.</p>
    </section><aside className="space-y-3 min-w-0">
      {!state.completed && <OrderTicket session={session} busy={busy} send={send} direction={direction} setDirection={setDirection}/>}
      {pending.map(o => <div className="pe-card pe-card-pad" key={o.id}><h2 className="font-semibold">Ordre en attente</h2><p className="text-sm mt-2">{o.side === "buy" ? "Achat" : "Vente"} · {o.kind} · {o.quantity} unités</p><p className="bt-note mt-2">{o.kind === "market" ? "Prochaine ouverture disponible" : `Déclenchement à ${o.price}`}</p><button className="pe-control mt-3" disabled={busy} onClick={() => send("cancel", { order_id: o.id })}>Annuler l’ordre</button></div>)}
      {state.position && <div className="pe-card pe-card-pad space-y-3"><h2 className="font-semibold">Position ouverte · {state.position.quantity}</h2><p className="text-sm">{state.position.side === "buy" ? "Achat" : "Vente"} à {state.position.entry}</p><p className="bt-note">Risque initial : {usd(state.position.initial_risk)}</p><button className="pe-control w-full" disabled={busy} onClick={() => send("breakeven")}>Déplacer le stop à l’entrée</button><form className="bt-form" onSubmit={e => { e.preventDefault(); send("close", { quantity: new FormData(e.currentTarget).get("quantity") }); }}><label>Quantité à clôturer<input key={state.position.quantity} name="quantity" type="number" min={instrument.quantity_step} step={instrument.quantity_step} max={state.position.quantity} defaultValue={state.position.quantity} required/></label><button className="btn-secondary" disabled={busy || Boolean(state.position.close_requested)}>{state.position.close_requested ? "Clôture en attente" : "Clôturer à la prochaine ouverture"}</button></form></div>}
      {!state.completed && <button className="pe-control w-full" disabled={busy || Boolean(state.position) || pending.length > 0} onClick={() => send("complete")}>Terminer la session</button>}
    </aside></div>
    <section className="pe-card pe-card-pad"><nav className="flex flex-wrap gap-2 mb-5">{[["journal", "Journal de backtest"], ["orders", "Historique des ordres"], ["analytics", "Analyse de session"]].map(([id, text]) => <button className={`pe-control ${tab === id ? "text-[#B58BFF] border-[#B58BFF]" : ""}`} key={id} onClick={() => setTab(id)}>{text}</button>)}</nav>
      {tab === "journal" && (state.trades.length ? <div className="overflow-x-auto"><table className="bt-table"><thead><tr><th>Clôture (UTC)</th><th>Sens</th><th>Quantité</th><th>Net</th><th>R net</th><th>Stratégie</th><th>Exécution</th></tr></thead><tbody>{state.trades.map(t => <tr key={t.id}><td>{new Date(t.closed_at * 1000).toISOString().replace("T", " ").slice(0, 16)}</td><td>{t.side === "buy" ? "Achat" : "Vente"}</td><td>{t.initial_quantity}</td><td className={Number(t.net) >= 0 ? "text-[#46C99A]" : "text-[#F26A70]"}>{usd(t.net)}</td><td>{t.r === null ? "—" : Number(t.r).toFixed(2)}</td><td>{t.strategy?.name || "—"}</td><td>{t.exits.some(e => e.ambiguous) ? "OHLC ambigu · conservateur" : t.exits.at(-1)?.reason}</td></tr>)}</tbody></table></div> : <p className="pe-page-copy">Aucun trade clôturé. Les positions fermées apparaîtront ici automatiquement, jamais dans le journal réel.</p>)}
      {tab === "orders" && <div className="space-y-3">{!state.orders.length && <p className="pe-page-copy">Aucun ordre placé.</p>}{state.orders.map(o => <div key={o.id} className="border-b border-white/10 pb-3"><p className="text-sm">{o.id} · {o.side} · {o.kind} · {o.quantity} · <span className="text-[#B58BFF]">{o.status}</span></p><p className="bt-note mt-1">{o.reason || (o.fill_price ? `Exécuté à ${o.fill_price}` : `Prix de référence ${o.price}`)}</p></div>)}</div>}
      {tab === "analytics" && <><div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[["Win rate", analytics.win_rate === null ? "—" : `${Number(analytics.win_rate).toFixed(1)} %`], ["Profit factor", analytics.profit_factor_unbounded ? "∞ (aucune perte)" : analytics.profit_factor === null ? "—" : Number(analytics.profit_factor).toFixed(2)], ["Espérance / trade", usd(analytics.expectancy)], ["Total R", Number(analytics.total_r).toFixed(2)], ["Gain moyen", usd(analytics.average_win)], ["Perte moyenne", usd(analytics.average_loss)], ["Série gagnante max", analytics.max_win_streak], ["Série perdante max", analytics.max_loss_streak]].map(([label, value]) => <div key={label}><p className="bt-note">{label}</p><p className="text-xl font-semibold font-numeric mt-2">{value}</p></div>)}</div><p className="bt-note mt-5">Calculs sur les trades entièrement clôturés, frais déduits. Les sorties partielles restent regroupées dans leur trade. Une petite série ne permet pas de conclure à la robustesse d’une stratégie.</p></>}
    </section>
  </div>;
}
