import React, { useEffect, useState } from "react";
import { payouts, accounts, dashboard } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Banknote } from "lucide-react";

export default function Payouts() {
  const [list, setList] = useState([]);
  const [accs, setAccs] = useState([]);
  const [kpi, setKpi] = useState(null);
  const [open, setOpen] = useState(false);
  const today = new Date().toISOString().slice(0,10);
  const [form, setForm] = useState({ account_id: "", amount: 0, date: today, note: "" });

  const load = async () => {
    const [p, a, d] = await Promise.all([payouts.list(), accounts.list(), dashboard()]);
    setList(p.data); setAccs(a.data); setKpi(d.data.kpis);
    if (!form.account_id && a.data.length > 0) setForm(f=>({...f, account_id: a.data[0].id}));
  };
  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    try {
      await payouts.create({ ...form, amount: Number(form.amount) });
      toast.success("Payout recorded");
      setOpen(false); load();
    } catch { toast.error("Failed"); }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-gradient">Payout Center</h1>
          <p className="text-[#9CA3AF] text-sm mt-1">Track withdrawals and project your next payout.</p>
        </div>
        <button onClick={()=>setOpen(true)} className="btn-primary inline-flex items-center gap-2" data-testid="add-payout-btn"><Plus className="w-4 h-4"/> Record Payout</button>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        <Stat label="Total Withdrawn" value={`$${(kpi?.total_payouts||0).toLocaleString()}`} color="#00E676" />
        <Stat label="Estimated Next Payout" value={`$${(kpi?.estimated_payout||0).toLocaleString()}`} color="#4F8CFF" />
        <Stat label="Payouts Recorded" value={list.length} color="#7C4DFF" />
      </div>
      <div className="card-elev p-5">
        <div className="text-xs font-mono uppercase text-[#9CA3AF] mb-4">History</div>
        {list.length === 0 ? <div className="text-[#9CA3AF] text-sm py-8 text-center">No payouts yet</div> : (
          <div className="space-y-2">
            {list.map(p => (
              <div key={p.id} className="flex items-center justify-between border-b border-white/5 py-3" data-testid={`payout-${p.id}`}>
                <div className="flex items-center gap-3"><Banknote className="w-4 h-4 text-[#00E676]"/><div><div className="text-sm">{p.date}</div><div className="text-xs text-[#9CA3AF]">{p.note}</div></div></div>
                <div className="text-lg font-bold font-mono text-[#00E676]">+${p.amount.toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      {open && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={()=>setOpen(false)}>
          <form onClick={(e)=>e.stopPropagation()} onSubmit={create} className="card-elev p-8 w-full max-w-md space-y-4 glow-green">
            <h2 className="text-2xl font-bold text-gradient">Record Payout</h2>
            <div>
              <label className="text-xs font-mono uppercase text-[#9CA3AF]">Account</label>
              <select value={form.account_id} onChange={(e)=>setForm({...form,account_id:e.target.value})} data-testid="p-account" className="w-full mt-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-[#4F8CFF]">
                {accs.map(a => <option key={a.id} value={a.id}>{a.firm} — {a.name}</option>)}
              </select>
            </div>
            <Fld label="Amount ($)" type="number" value={form.amount} onChange={(v)=>setForm({...form,amount:v})} testid="p-amount" />
            <Fld label="Date" type="date" value={form.date} onChange={(v)=>setForm({...form,date:v})} testid="p-date" />
            <Fld label="Note" value={form.note} onChange={(v)=>setForm({...form,note:v})} testid="p-note" />
            <button className="btn-primary w-full" data-testid="p-submit">Save</button>
          </form>
        </div>
      )}
    </div>
  );
}

const Stat = ({ label, value, color }) => (
  <div className="card-elev p-5"><div className="text-xs font-mono uppercase text-[#9CA3AF]">{label}</div><div className="text-3xl font-bold font-mono mt-2" style={{color}}>{value}</div></div>
);
const Fld = ({ label, value, onChange, type="text", testid }) => (
  <div><label className="text-xs font-mono uppercase text-[#9CA3AF]">{label}</label><input type={type} required value={value} onChange={(e)=>onChange(e.target.value)} data-testid={testid} className="w-full mt-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 font-mono outline-none focus:border-[#4F8CFF]"/></div>
);
