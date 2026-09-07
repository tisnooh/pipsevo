import React, { useState } from "react";
import { usd } from "./api";

export default function OrderTicket({ session, busy, send, direction, setDirection }) {
  const [kind, setKind] = useState("market");
  const [mode, setMode] = useState("quantity");
  const rules = session.config.strategy?.rules || [];
  return <form className="pe-card pe-card-pad bt-form" onSubmit={event => {
    event.preventDefault(); const f = new FormData(event.currentTarget);
    send("order", { side: direction, kind, price: f.get("price"), stop_loss: f.get("stop_loss"), take_profit: f.get("take_profit") || null,
      risk_mode: mode, risk_value: f.get("risk_value"), checklist: Object.fromEntries(rules.map((r, i) => [r, f.has(`rule-${i}`)])) });
  }}>
    <h2 className="font-semibold">Ticket de simulation</h2>
    <div className="grid grid-cols-2 gap-2"><button type="button" aria-pressed={direction === "buy"} onClick={() => setDirection("buy")} className={`pe-control ${direction === "buy" ? "border-[#46C99A] text-[#46C99A]" : ""}`}>Achat · B</button><button type="button" aria-pressed={direction === "sell"} onClick={() => setDirection("sell")} className={`pe-control ${direction === "sell" ? "border-[#F26A70] text-[#F26A70]" : ""}`}>Vente · S</button></div>
    <label>Type<select value={kind} onChange={e => setKind(e.target.value)}><option value="market">Marché · prochaine ouverture</option><option value="limit">Limite</option><option value="stop">Stop</option></select></label>
    {kind !== "market" && <label>Prix d’entrée<input name="price" required type="number" min="0" step="any"/></label>}
    <div className="grid grid-cols-2 gap-3"><label>Stop loss<input name="stop_loss" type="number" min="0" step="any" required/></label><label>Take profit (facultatif)<input name="take_profit" type="number" min="0" step="any"/></label></div>
    <label>Dimensionnement<select value={mode} onChange={e => setMode(e.target.value)}><option value="quantity">Quantité fixe (contrats / lots)</option><option value="amount">Risque maximal en USD</option><option value="percent">Risque maximal en %</option></select></label>
    <label>{mode === "quantity" ? "Quantité" : mode === "amount" ? "Budget de risque (USD)" : "Risque (%)"}<input key={mode} name="risk_value" type="number" min="0.01" step="any" max={mode === "percent" ? 10 : undefined} defaultValue={mode === "amount" ? "100" : "1"} required/></label>
    {rules.length > 0 && <fieldset><legend className="mb-2 text-sm">{session.config.strategy.name}</legend>{rules.map((r, i) => <label key={i} className="bt-check mb-2"><input type="checkbox" name={`rule-${i}`}/>{r}</label>)}</fieldset>}
    <p className="bt-note">Frais aller-retour : {usd(session.config.commission)} / unité · Slippage : {session.config.slippage_ticks} tick(s). Le risque inclut les frais et le slippage estimé. Un gap dépassant le budget entraîne le rejet de l’ordre.</p>
    <button className="btn-primary" disabled={busy || session.state.completed || Boolean(session.state.position) || session.state.orders.some(o => o.status === "pending")}>Placer l’ordre simulé</button>
  </form>;
}
