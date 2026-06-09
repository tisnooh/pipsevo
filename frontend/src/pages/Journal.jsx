import React, { useEffect, useState } from "react";
import { trades, accounts } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Trash2, TrendingUp, TrendingDown } from "lucide-react";

const SETUPS = ["London FVG", "NY Open Drive", "Asia Range", "Liquidity Sweep", "Order Block", "Other"];
const EMOTIONS = ["Confident", "Neutral", "Disciplined", "Stressed", "Fearful", "Revenge"];
const SESSIONS = ["London", "NY", "Asia"];

export default function Journal() {
  const [list, setList] = useState([]);
  const [accs, setAccs] = useState([]);
  const [open, setOpen] = useState(false);
  const todayStr = new Date().toISOString().slice(0,10);
  const [form, setForm] = useState({ account_id: "", date: todayStr, instrument: "ES", direction: "long", entry: 0, stop: 0, take_profit: 0, exit_price: 0, pnl: 0, setup: "London FVG", session: "London", emotion: "Disciplined", notes: "", plan_respected: true });

  const load = async () => {
    const t = await trades.list();
    setList(t.data);
    const a = await accounts.list();
    setAccs(a.data);
    if (!form.account_id && a.data.length > 0) setForm(f => ({...f, account_id: a.data[0].id}));
  };
  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    if (!form.account_id) return toast.error("Add an account first");
    try {
      await trades.create({ ...form, entry: Number(form.entry), stop: Number(form.stop), take_profit: Number(form.take_profit), exit_price: Number(form.exit_price), pnl: Number(form.pnl) });
      toast.success("Trade logged");
      setOpen(false);
      load();
    } catch { toast.error("Failed"); }
  };

  const del = async (id) => {
    await trades.delete(id);
    toast.success("Deleted");
    load();
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-gradient">Trading Journal</h1>
          <p className="text-[#9CA3AF] text-sm mt-1">Every trade. Every emotion. Every lesson.</p>
        </div>
        <button onClick={() => setOpen(true)} className="btn-primary inline-flex items-center gap-2" data-testid="add-trade-btn"><Plus className="w-4 h-4" /> Log Trade</button>
      </div>

      {list.length === 0 ? (
        <div className="card-elev p-12 text-center text-[#9CA3AF]">No trades logged yet.</div>
      ) : (
        <div className="card-elev overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-black/40">
              <tr className="text-[#9CA3AF] uppercase font-mono text-xs">
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Instrument</th>
                <th className="px-4 py-3 text-left">Dir</th>
                <th className="px-4 py-3 text-right">P&L</th>
                <th className="px-4 py-3 text-left">Setup</th>
                <th className="px-4 py-3 text-left">Session</th>
                <th className="px-4 py-3 text-left">Emotion</th>
                <th className="px-4 py-3 text-center">Plan</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {list.map(t => (
                <tr key={t.id} className="border-t border-white/5 hover:bg-white/2" data-testid={`trade-${t.id}`}>
                  <td className="px-4 py-3 font-mono">{t.date}</td>
                  <td className="px-4 py-3">{t.instrument}</td>
                  <td className="px-4 py-3">{t.direction === "long" ? <TrendingUp className="w-4 h-4 text-[#00E676]"/> : <TrendingDown className="w-4 h-4 text-[#FF5252]"/>}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold" style={{ color: t.pnl >= 0 ? "#00E676" : "#FF5252" }}>{t.pnl >= 0 ? "+" : ""}${t.pnl}</td>
                  <td className="px-4 py-3 text-[#9CA3AF]">{t.setup}</td>
                  <td className="px-4 py-3 text-[#9CA3AF]">{t.session}</td>
                  <td className="px-4 py-3 text-[#9CA3AF]">{t.emotion}</td>
                  <td className="px-4 py-3 text-center">{t.plan_respected ? "✓" : "✗"}</td>
                  <td className="px-4 py-3"><button onClick={()=>del(t.id)} className="text-[#FF5252] hover:opacity-70"><Trash2 className="w-4 h-4"/></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={() => setOpen(false)}>
          <form onClick={(e)=>e.stopPropagation()} onSubmit={create} className="card-elev p-8 w-full max-w-2xl space-y-4 glow-blue my-12">
            <h2 className="text-2xl font-bold text-gradient">New Trade</h2>
            <div className="grid grid-cols-2 gap-3">
              <Sel label="Account" value={form.account_id} onChange={(v)=>setForm({...form,account_id:v})} options={accs.map(a=>({v:a.id,l:`${a.firm} — ${a.name}`}))} testid="t-account" />
              <Fld label="Date" type="date" value={form.date} onChange={(v)=>setForm({...form,date:v})} testid="t-date" />
              <Fld label="Instrument" value={form.instrument} onChange={(v)=>setForm({...form,instrument:v})} testid="t-instrument" />
              <Sel label="Direction" value={form.direction} onChange={(v)=>setForm({...form,direction:v})} options={[{v:"long",l:"Long"},{v:"short",l:"Short"}]} testid="t-direction" />
              <Fld label="Entry" type="number" step="0.01" value={form.entry} onChange={(v)=>setForm({...form,entry:v})} testid="t-entry" />
              <Fld label="Stop" type="number" step="0.01" value={form.stop} onChange={(v)=>setForm({...form,stop:v})} testid="t-stop" />
              <Fld label="TP" type="number" step="0.01" value={form.take_profit} onChange={(v)=>setForm({...form,take_profit:v})} testid="t-tp" />
              <Fld label="Exit" type="number" step="0.01" value={form.exit_price} onChange={(v)=>setForm({...form,exit_price:v})} testid="t-exit" />
              <Fld label="P&L ($)" type="number" step="0.01" value={form.pnl} onChange={(v)=>setForm({...form,pnl:v})} testid="t-pnl" />
              <Sel label="Setup" value={form.setup} onChange={(v)=>setForm({...form,setup:v})} options={SETUPS.map(s=>({v:s,l:s}))} testid="t-setup" />
              <Sel label="Session" value={form.session} onChange={(v)=>setForm({...form,session:v})} options={SESSIONS.map(s=>({v:s,l:s}))} testid="t-session" />
              <Sel label="Emotion" value={form.emotion} onChange={(v)=>setForm({...form,emotion:v})} options={EMOTIONS.map(s=>({v:s,l:s}))} testid="t-emotion" />
            </div>
            <div>
              <label className="text-xs font-mono uppercase text-[#9CA3AF]">Notes</label>
              <textarea value={form.notes} onChange={(e)=>setForm({...form,notes:e.target.value})} rows={2} data-testid="t-notes" className="w-full mt-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-[#4F8CFF]" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.plan_respected} onChange={(e)=>setForm({...form,plan_respected:e.target.checked})} data-testid="t-plan" /> Plan respected
            </label>
            <button className="btn-primary w-full" data-testid="t-submit">Log Trade</button>
          </form>
        </div>
      )}
    </div>
  );
}

const Fld = ({ label, value, onChange, type="text", step, testid }) => (
  <div>
    <label className="text-xs font-mono uppercase text-[#9CA3AF]">{label}</label>
    <input type={type} step={step} required value={value} onChange={(e)=>onChange(e.target.value)} data-testid={testid} className="w-full mt-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 font-mono outline-none focus:border-[#4F8CFF]" />
  </div>
);
const Sel = ({ label, value, onChange, options, testid }) => (
  <div>
    <label className="text-xs font-mono uppercase text-[#9CA3AF]">{label}</label>
    <select value={value} onChange={(e)=>onChange(e.target.value)} data-testid={testid} className="w-full mt-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-[#4F8CFF]">
      {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
  </div>
);
