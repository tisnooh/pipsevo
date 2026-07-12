import React, { useEffect, useState } from "react";
import { payouts, accounts as accAPI, dashboard } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Banknote, Calendar, TrendingUp } from "lucide-react";

export default function Payouts() {
  const [list, setList] = useState([]);
  const [accs, setAccs] = useState([]);
  const [kpi, setKpi] = useState(null);
  const [open, setOpen] = useState(false);
  const today = new Date().toISOString().slice(0,10);
  const [form, setForm] = useState({ account_id: "", amount: 1000, date: today, note: "" });
  const [sim, setSim] = useState({ daily: 200, days: 20, target: 5000 });

  const load = async () => {
    const [p, a, d] = await Promise.all([payouts.list(), accAPI.list(), dashboard()]);
    setList(p.data); setAccs(a.data); setKpi(d.data.kpis);
    if (!form.account_id && a.data.length > 0) setForm(f => ({ ...f, account_id: a.data[0].id }));
  };
  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    try {
      await payouts.create({ ...form, amount: +form.amount });
      toast.success("Payout enregistré"); setOpen(false); load();
    } catch { toast.error("Erreur"); }
  };

  const estimated = +sim.daily * +sim.days;
  const prob = Math.min(95, Math.max(5, 100 - Math.abs(estimated - sim.target) / sim.target * 60));

  return (
    <div className="p-4 sm:p-7 space-y-5">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Payouts</h1>
          <p className="text-sm text-[#9CA3AF] mt-1">Suis tes retraits et projette ton prochain payout.</p>
        </div>
        <button onClick={()=>setOpen(true)} className="btn-primary inline-flex items-center justify-center gap-2 text-sm py-2.5 w-full sm:w-auto" data-testid="add-payout-btn"><Plus className="w-4 h-4"/> Enregistrer un payout</button>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Stat label="Total retiré" value={`$${(kpi?.total_payouts||0).toLocaleString()}`} color="#00E676" icon={Banknote} />
        <Stat label="Prochain payout estimé" value={`$${(kpi?.estimated_payout||0).toLocaleString()}`} color="#B58BFF" icon={TrendingUp} />
        <Stat label="Payouts enregistrés" value={list.length} color="#4F8CFF" icon={Calendar} />
      </div>

      {/* Simulator */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card-elev p-6">
          <div className="text-sm font-semibold mb-4">Simulateur de payout</div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <Fld label="Profit / jour" value={sim.daily} onChange={(v)=>setSim({...sim,daily:v})} testid="sim-daily" />
            <Fld label="Jours restants" value={sim.days} onChange={(v)=>setSim({...sim,days:v})} testid="sim-days" />
            <Fld label="Objectif ($)" value={sim.target} onChange={(v)=>setSim({...sim,target:v})} testid="sim-target" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
            <SimOut label="Estimé" value={`$${estimated.toLocaleString()}`} color="#00E676" />
            <SimOut label="Date estimée" value={new Date(Date.now()+sim.days*86400000).toLocaleDateString()} color="#B58BFF" />
            <SimOut label="Probabilité" value={`${prob.toFixed(0)}%`} color="#4F8CFF" />
          </div>
        </div>

        <div className="card-elev p-6">
          <div className="text-sm font-semibold mb-4">Historique</div>
          {list.length === 0 ? <div className="text-xs text-[#9CA3AF] py-8 text-center">Pas encore de payout</div> : (
            <div className="space-y-1">
              {list.map(p => (
                <div key={p.id} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0" data-testid={`payout-${p.id}`}>
                  <div className="flex items-center gap-3"><Banknote className="w-4 h-4 text-[#00E676]"/><div><div className="text-sm">{p.date}</div><div className="text-xs text-[#9CA3AF]">{p.note || "—"}</div></div></div>
                  <div className="text-lg font-bold font-mono text-[#00E676]">+${p.amount.toLocaleString()}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={()=>setOpen(false)}>
          <form onClick={(e)=>e.stopPropagation()} onSubmit={create} className="card-elev p-5 sm:p-8 w-full max-w-md space-y-4 glow-green max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold">Enregistrer un payout</h2>
            <div>
              <label className="text-xs font-mono uppercase text-[#9CA3AF]">Compte</label>
              <select value={form.account_id} onChange={(e)=>setForm({...form,account_id:e.target.value})} data-testid="p-account" className="w-full mt-1 bg-[#0D1020] border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-[#7C4DFF]">
                {accs.map(a => <option key={a.id} value={a.id}>{a.firm} — {a.name}</option>)}
              </select>
            </div>
            <Fld label="Montant ($)" type="number" value={form.amount} onChange={(v)=>setForm({...form,amount:v})} testid="p-amount" />
            <Fld label="Date" type="date" value={form.date} onChange={(v)=>setForm({...form,date:v})} testid="p-date" />
            <Fld label="Note" value={form.note} onChange={(v)=>setForm({...form,note:v})} testid="p-note" />
            <button className="btn-primary w-full" data-testid="p-submit">Enregistrer</button>
          </form>
        </div>
      )}
    </div>
  );
}

const Stat = ({ label, value, color, icon: Icon }) => (
  <div className="card-elev p-5">
    <div className="flex justify-between"><div className="text-xs text-[#9CA3AF]">{label}</div><Icon className="w-4 h-4" style={{color}}/></div>
    <div className="text-3xl font-bold font-mono mt-2" style={{color}}>{value}</div>
  </div>
);
const SimOut = ({ label, value, color }) => (
  <div className="card-flat p-3"><div className="text-[10px] text-[#9CA3AF] uppercase font-mono">{label}</div><div className="font-mono font-bold mt-1" style={{color}}>{value}</div></div>
);
const Fld = ({ label, value, onChange, type="text", testid }) => (
  <div><label className="text-xs font-mono uppercase text-[#9CA3AF]">{label}</label><input type={type} required value={value} onChange={(e)=>onChange(e.target.value)} data-testid={testid} className="w-full mt-1 bg-[#0D1020] border border-white/10 rounded-xl px-4 py-2.5 font-mono outline-none focus:border-[#7C4DFF]"/></div>
);
