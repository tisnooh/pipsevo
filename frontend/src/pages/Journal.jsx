import React, { useEffect, useState } from "react";
import { trades, accounts as accAPI } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Filter, Star, X, Edit, Trash2, Calendar } from "lucide-react";

const SETUPS = ["London FVG", "NY Open Drive", "Asia Range", "Liquidity Sweep", "Order Block", "Breakout", "Reversal", "Trend", "FVG", "News", "Volatility", "Other"];
const EMOTIONS = ["Confident", "Neutral", "Disciplined", "Stressed", "Fearful", "Revenge"];
const SESSIONS = ["London", "NY", "Asia"];

export default function Journal() {
  const [list, setList] = useState([]);
  const [accs, setAccs] = useState([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState("Tous les trades");
  const today = new Date().toISOString().slice(0,10);
  const [form, setForm] = useState({ account_id: "", date: today, instrument: "EURUSD", direction: "long", entry: 0, stop: 0, take_profit: 0, exit_price: 0, pnl: 0, setup: "Breakout", session: "London", emotion: "Disciplined", notes: "", plan_respected: true });

  const load = async () => {
    const [t, a] = await Promise.all([trades.list(), accAPI.list()]);
    setList(t.data); setAccs(a.data);
    if (!form.account_id && a.data.length > 0) setForm(f => ({...f, account_id: a.data[0].id}));
    if (!selected && t.data.length > 0) setSelected(t.data[0]);
  };
  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    if (!form.account_id) return toast.error("Ajoute un compte d'abord");
    try {
      const { data } = await trades.create({ ...form, entry: +form.entry, stop: +form.stop, take_profit: +form.take_profit, exit_price: +form.exit_price, pnl: +form.pnl });
      toast.success("Trade logué");
      setOpen(false); load();
      setSelected(data);
    } catch { toast.error("Erreur"); }
  };

  const del = async (id) => {
    await trades.delete(id); toast.success("Supprimé");
    if (selected?.id === id) setSelected(null);
    load();
  };

  const filtered = tab === "Positions ouvertes" ? [] : tab === "Favoris" ? list.filter(t => t.fav) : list;

  const wins = list.filter(t => t.pnl > 0);
  const losses = list.filter(t => t.pnl < 0);
  const wr = list.length ? (wins.length/list.length*100).toFixed(0) : 0;
  const sumPnl = list.reduce((a,b)=>a+(b.pnl||0),0);
  const avgWin = wins.length ? wins.reduce((a,b)=>a+b.pnl,0)/wins.length : 0;
  const avgLoss = losses.length ? losses.reduce((a,b)=>a+b.pnl,0)/losses.length : 0;
  const avgR = list.length ? (sumPnl/list.length/100).toFixed(2) : 0;

  return (
    <div className="p-7 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Journal</h1>
        <div className="flex items-center gap-2">
          <button className="card-flat px-3 py-2 text-xs flex items-center gap-2">📋 Tous les comptes ▾</button>
          <button className="card-flat px-3 py-2 text-xs flex items-center gap-2"><Calendar className="w-3 h-3"/>30 derniers jours</button>
          <button className="card-flat px-3 py-2 text-xs flex items-center gap-2"><Filter className="w-3 h-3"/>Filtres</button>
          <button onClick={() => setOpen(true)} className="btn-primary inline-flex items-center gap-2 text-sm py-2" data-testid="add-trade-btn"><Plus className="w-4 h-4"/> Nouveau trade</button>
        </div>
      </div>

      <div className="flex gap-6 border-b border-white/5">
        {["Tous les trades","Positions ouvertes","Favoris"].map(t => (
          <button key={t} onClick={()=>setTab(t)} data-testid={`journal-tab-${t}`} className={`pb-3 text-sm ${tab===t?"text-white border-b-2 border-[#7C4DFF]":"text-[#9CA3AF]"}`}>{t}</button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <JKpi label="Trades" value={list.length} sub={`+ ${list.length} vs période précédente`} color="white" />
        <JKpi label="Win Rate" value={`${wr}%`} sub="+ 8%" color="white" />
        <JKpi label="Profit net" value={`${sumPnl>=0?"+":""}$${sumPnl.toFixed(0)}`} sub="+ 12.4%" color="#00E676" />
        <JKpi label="Gain moyen" value={`+$${avgWin.toFixed(2)}`} color="#00E676" />
        <JKpi label="Perte moyenne" value={`$${avgLoss.toFixed(2)}`} color="#FF5252" />
        <JKpi label="R Multiple moyen" value={avgR} color="#B58BFF" />
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-4">
        <div className="card-elev overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase font-mono text-[#6B7280]">
              <tr className="border-b border-white/5">
                <th className="text-left py-3 pl-5 font-normal">Date</th>
                <th className="text-left font-normal">Actif</th>
                <th className="text-left font-normal">Direction</th>
                <th className="text-right font-normal">Résultat</th>
                <th className="text-right font-normal">R Multiple</th>
                <th className="text-left pl-4 font-normal">Durée</th>
                <th className="text-left font-normal">Compte</th>
                <th className="text-left font-normal">Tags</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={9} className="text-center py-12 text-[#9CA3AF] text-sm">Aucun trade dans cet onglet.</td></tr>}
              {filtered.map(t => (
                <tr key={t.id} onClick={()=>setSelected(t)} className={`border-t border-white/5 cursor-pointer hover:bg-white/[0.02] ${selected?.id===t.id?"bg-[#7C4DFF]/5":""}`} data-testid={`trade-row-${t.id}`}>
                  <td className="py-3 pl-5 text-xs text-[#B5BBC9]"><Star className="w-3.5 h-3.5 inline mr-2 text-[#6B7280]"/>{t.date}</td>
                  <td className="font-medium">{t.instrument}</td>
                  <td className={t.direction === "long" ? "text-[#00E676]" : "text-[#FF5252]"}>{t.direction === "long" ? "Achat (Long)" : "Vente (Short)"}</td>
                  <td className="text-right font-mono" style={{ color: t.pnl >= 0 ? "#00E676" : "#FF5252" }}>{t.pnl>=0?"+":""}${t.pnl}</td>
                  <td className="text-right font-mono text-[#B5BBC9]">{((t.pnl||0)/100).toFixed(2)}R</td>
                  <td className="pl-4 text-xs text-[#9CA3AF]">{t.session?"2h 15m":"—"}</td>
                  <td className="text-xs text-[#B5BBC9]">{(accs.find(a=>a.id===t.account_id)?.firm)||"—"}</td>
                  <td>{t.setup && <span className="text-[10px] px-2 py-0.5 rounded border border-white/10 text-[#B5BBC9]">{t.setup}</span>}</td>
                  <td className="pr-4 text-[#6B7280]">⋯</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length > 0 && <div className="text-center py-4 text-xs text-[#B58BFF] border-t border-white/5">Voir plus de trades ↓</div>}
        </div>

        {/* DETAIL PANEL */}
        <div className="card-elev p-5 sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto">
          {selected ? (
            <>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="text-xl font-bold">{selected.instrument}</div>
                  <span className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded ${selected.pnl>=0?"bg-[#00E676]/15 text-[#00E676] border border-[#00E676]/30":"bg-[#FF5252]/15 text-[#FF5252] border border-[#FF5252]/30"}`}>{selected.pnl>=0?"Gagnant":"Perdant"}</span>
                </div>
                <button onClick={()=>setSelected(null)} className="text-[#6B7280] hover:text-white"><X className="w-4 h-4"/></button>
              </div>
              <div className={`text-sm font-medium flex items-center gap-1 ${selected.direction==="long"?"text-[#00E676]":"text-[#FF5252]"}`}>↗ {selected.direction==="long"?"Achat (Long)":"Vente (Short)"}</div>
              <div className="flex justify-between text-sm font-mono mt-3 pb-3 border-b border-white/5">
                <span className="text-[#B58BFF]">+{((selected.pnl||0)/100).toFixed(2)}R</span>
                <span className="text-[#00E676]">{selected.pnl>=0?"+":""}${selected.pnl}</span>
              </div>
              <div className="flex gap-4 mt-3 border-b border-white/5 text-xs">
                {["Aperçu","Graphique","Notes","Stats"].map(t => <button key={t} className={`pb-2 ${t==="Aperçu"?"text-white border-b-2 border-[#7C4DFF]":"text-[#9CA3AF]"}`}>{t}</button>)}
              </div>
              <div className="space-y-2 text-xs mt-3">
                <DRow k="Date d'entrée" v={`${selected.date} - 12:17`} />
                <DRow k="Date de sortie" v={`${selected.date} - 14:32`} />
                <DRow k="Durée" v="2h 15m" />
                <DRow k="Actif" v={selected.instrument} />
                <DRow k="Compte" v={accs.find(a=>a.id===selected.account_id)?.name || "—"} />
                <DRow k="Entrée" v={selected.entry || "—"} />
                <DRow k="Sortie" v={selected.exit_price || "—"} />
                <DRow k="Stop Loss" v={selected.stop || "—"} />
                <DRow k="Take Profit" v={selected.take_profit || "—"} />
                <DRow k="R Multiple" v={`${((selected.pnl||0)/100).toFixed(2)}R`} color="#B58BFF" />
                <DRow k="Résultat" v={`${selected.pnl>=0?"+":""}$${selected.pnl}`} color={selected.pnl>=0?"#00E676":"#FF5252"} />
              </div>
              <div className="mt-4 pt-3 border-t border-white/5">
                <div className="text-xs font-semibold mb-2">Notes</div>
                <p className="text-xs text-[#B5BBC9] leading-relaxed">{selected.notes || "Pas de notes."}</p>
              </div>
              {selected.setup && (
                <div className="mt-3 flex gap-2"><span className="text-[10px] px-2 py-0.5 rounded border border-white/10 text-[#B5BBC9]">{selected.setup}</span></div>
              )}
              <div className="mt-4 grid grid-cols-4 gap-2">
                {[1,2,3].map(i => <div key={i} className="aspect-square rounded-lg bg-gradient-to-br from-[#1A1F2E] to-[#0A0D18] border border-white/5 flex items-center justify-center text-[10px] text-[#6B7280]">Capture {i}</div>)}
                <div className="aspect-square rounded-lg border border-dashed border-white/10 flex items-center justify-center text-[#6B7280] cursor-pointer hover:border-[#7C4DFF]/50"><Plus className="w-4 h-4"/></div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                <button className="btn-ghost text-xs py-2 inline-flex items-center justify-center gap-2"><Edit className="w-3 h-3"/>Modifier</button>
                <button onClick={()=>del(selected.id)} className="card-flat text-xs py-2 inline-flex items-center justify-center gap-2 text-[#FF5252] border-[#FF5252]/30"><Trash2 className="w-3 h-3"/>Supprimer</button>
              </div>
            </>
          ) : <div className="text-center text-sm text-[#9CA3AF] py-10">Sélectionne un trade pour voir les détails.</div>}
        </div>
      </div>

      {/* MODAL */}
      {open && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={()=>setOpen(false)}>
          <form onClick={(e)=>e.stopPropagation()} onSubmit={create} className="card-elev p-8 w-full max-w-2xl space-y-4 glow-purple my-8">
            <h2 className="text-2xl font-bold">Nouveau trade</h2>
            <div className="grid grid-cols-2 gap-3">
              <Sel label="Compte" value={form.account_id} onChange={(v)=>setForm({...form,account_id:v})} options={accs.map(a=>({v:a.id,l:`${a.firm} — ${a.name}`}))} testid="t-account" />
              <Fld label="Date" type="date" value={form.date} onChange={(v)=>setForm({...form,date:v})} testid="t-date" />
              <Fld label="Actif" value={form.instrument} onChange={(v)=>setForm({...form,instrument:v})} testid="t-instrument" />
              <Sel label="Direction" value={form.direction} onChange={(v)=>setForm({...form,direction:v})} options={[{v:"long",l:"Achat (Long)"},{v:"short",l:"Vente (Short)"}]} testid="t-direction" />
              <Fld label="Entrée" type="number" step="0.0001" value={form.entry} onChange={(v)=>setForm({...form,entry:v})} testid="t-entry" />
              <Fld label="Stop Loss" type="number" step="0.0001" value={form.stop} onChange={(v)=>setForm({...form,stop:v})} testid="t-stop" />
              <Fld label="Take Profit" type="number" step="0.0001" value={form.take_profit} onChange={(v)=>setForm({...form,take_profit:v})} testid="t-tp" />
              <Fld label="Sortie" type="number" step="0.0001" value={form.exit_price} onChange={(v)=>setForm({...form,exit_price:v})} testid="t-exit" />
              <Fld label="Résultat ($)" type="number" step="0.01" value={form.pnl} onChange={(v)=>setForm({...form,pnl:v})} testid="t-pnl" />
              <Sel label="Setup" value={form.setup} onChange={(v)=>setForm({...form,setup:v})} options={SETUPS.map(s=>({v:s,l:s}))} testid="t-setup" />
              <Sel label="Session" value={form.session} onChange={(v)=>setForm({...form,session:v})} options={SESSIONS.map(s=>({v:s,l:s}))} testid="t-session" />
              <Sel label="Émotion" value={form.emotion} onChange={(v)=>setForm({...form,emotion:v})} options={EMOTIONS.map(s=>({v:s,l:s}))} testid="t-emotion" />
            </div>
            <div>
              <label className="text-xs font-mono uppercase text-[#9CA3AF]">Notes</label>
              <textarea value={form.notes} onChange={(e)=>setForm({...form,notes:e.target.value})} rows={3} data-testid="t-notes" className="w-full mt-1 bg-[#0D1020] border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-[#7C4DFF]" />
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.plan_respected} onChange={(e)=>setForm({...form,plan_respected:e.target.checked})} data-testid="t-plan" /> Plan respecté</label>
            <button className="btn-primary w-full" data-testid="t-submit">Logger le trade</button>
          </form>
        </div>
      )}
    </div>
  );
}

const JKpi = ({ label, value, sub, color }) => (
  <div className="card-elev p-4">
    <div className="text-xs text-[#9CA3AF]">{label}</div>
    <div className="text-2xl font-bold font-mono mt-2" style={{ color: color || "white" }}>{value}</div>
    {sub && <div className="text-[10px] text-[#00E676] mt-1">{sub}</div>}
  </div>
);
const DRow = ({ k, v, color }) => (
  <div className="flex justify-between"><span className="text-[#9CA3AF]">{k}</span><span className="font-mono" style={{ color: color || "white" }}>{v}</span></div>
);
const Fld = ({ label, value, onChange, type="text", step, testid }) => (
  <div><label className="text-xs font-mono uppercase text-[#9CA3AF]">{label}</label><input type={type} step={step} required value={value} onChange={(e)=>onChange(e.target.value)} data-testid={testid} className="w-full mt-1 bg-[#0D1020] border border-white/10 rounded-xl px-4 py-2.5 font-mono outline-none focus:border-[#7C4DFF]"/></div>
);
const Sel = ({ label, value, onChange, options, testid }) => (
  <div><label className="text-xs font-mono uppercase text-[#9CA3AF]">{label}</label><select value={value} onChange={(e)=>onChange(e.target.value)} data-testid={testid} className="w-full mt-1 bg-[#0D1020] border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-[#7C4DFF]">{options.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}</select></div>
);
