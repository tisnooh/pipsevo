import React, { useEffect, useState } from "react";
import { accounts } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Trash2, Shield, Activity } from "lucide-react";

const FIRMS = ["Topstep", "Apex", "FTMO", "FundedNext", "The5ers", "Take Profit Trader"];

export default function Accounts() {
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", firm: "Topstep", balance: 50000, initial_balance: 50000, profit_target: 3000, max_drawdown: 2000 });

  const load = () => accounts.list().then(r => setList(r.data));
  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    try {
      await accounts.create({ ...form, balance: Number(form.balance), initial_balance: Number(form.initial_balance), profit_target: Number(form.profit_target), max_drawdown: Number(form.max_drawdown) });
      toast.success("Account added");
      setOpen(false);
      load();
    } catch (e) { toast.error("Failed"); }
  };

  const del = async (id) => {
    if (!window.confirm("Delete account and its trades?")) return;
    await accounts.delete(id);
    toast.success("Deleted");
    load();
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-gradient">Prop Firm Accounts</h1>
          <p className="text-[#9CA3AF] text-sm mt-1">Each account, tracked. Each rule, enforced.</p>
        </div>
        <button onClick={() => setOpen(true)} className="btn-primary inline-flex items-center gap-2" data-testid="add-account-btn"><Plus className="w-4 h-4" /> Add Account</button>
      </div>

      {list.length === 0 ? (
        <div className="card-elev p-12 text-center text-[#9CA3AF]">No accounts yet. Add your first prop firm account.</div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map(a => (
            <div key={a.id} className="card-elev p-5" data-testid={`account-${a.id}`}>
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-xs font-mono uppercase text-[#9CA3AF]">{a.firm}</div>
                  <div className="text-xl font-semibold mt-1">{a.name}</div>
                </div>
                <button onClick={() => del(a.id)} className="text-[#FF5252] hover:opacity-70"><Trash2 className="w-4 h-4" /></button>
              </div>
              <div className="text-3xl font-bold font-mono mt-4">${a.balance.toLocaleString()}</div>
              <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
                <div><div className="text-[#9CA3AF] uppercase font-mono">Target</div><div className="font-mono">${a.profit_target.toLocaleString()}</div></div>
                <div><div className="text-[#9CA3AF] uppercase font-mono">Max DD</div><div className="font-mono">${a.max_drawdown.toLocaleString()}</div></div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-black/30 p-2"><div className="text-[10px] text-[#9CA3AF] font-mono">HEALTH</div><div className="font-mono font-bold flex items-center gap-1"><Shield className="w-3 h-3 text-[#00E676]"/> {a.health_score}</div></div>
                <div className="rounded-lg bg-black/30 p-2"><div className="text-[10px] text-[#9CA3AF] font-mono">SURVIVAL</div><div className="font-mono font-bold flex items-center gap-1"><Activity className="w-3 h-3 text-[#4F8CFF]"/> {a.survival_score}%</div></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setOpen(false)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={create} className="card-elev p-8 w-full max-w-md space-y-4 glow-blue">
            <h2 className="text-2xl font-bold text-gradient">New Account</h2>
            <Fld label="Name" value={form.name} onChange={(v)=>setForm({...form,name:v})} testid="acc-name" />
            <div>
              <label className="text-xs font-mono uppercase text-[#9CA3AF]">Prop Firm</label>
              <select value={form.firm} onChange={(e)=>setForm({...form,firm:e.target.value})} data-testid="acc-firm" className="w-full mt-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-[#4F8CFF]">
                {FIRMS.map(f => <option key={f}>{f}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Fld label="Balance ($)" type="number" value={form.balance} onChange={(v)=>setForm({...form,balance:v})} testid="acc-balance" />
              <Fld label="Initial ($)" type="number" value={form.initial_balance} onChange={(v)=>setForm({...form,initial_balance:v})} testid="acc-initial" />
              <Fld label="Profit Target" type="number" value={form.profit_target} onChange={(v)=>setForm({...form,profit_target:v})} testid="acc-target" />
              <Fld label="Max Drawdown" type="number" value={form.max_drawdown} onChange={(v)=>setForm({...form,max_drawdown:v})} testid="acc-dd" />
            </div>
            <button className="btn-primary w-full" data-testid="acc-submit">Create</button>
          </form>
        </div>
      )}
    </div>
  );
}

const Fld = ({ label, value, onChange, type="text", testid }) => (
  <div>
    <label className="text-xs font-mono uppercase text-[#9CA3AF]">{label}</label>
    <input type={type} required value={value} onChange={(e)=>onChange(e.target.value)} data-testid={testid} className="w-full mt-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 font-mono outline-none focus:border-[#4F8CFF]" />
  </div>
);
