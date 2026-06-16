import React, { useEffect, useState } from "react";
import { accounts } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Trash2, Shield, Activity, TrendingUp, Target } from "lucide-react";

const FIRMS = ["Topstep", "Apex", "FTMO", "FundedNext", "The5ers", "Take Profit Trader"];

export default function Accounts() {
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "Combine", firm: "Topstep", balance: 50000, initial_balance: 50000, profit_target: 3000, max_drawdown: 2000 });

  const load = () => accounts.list().then(r => setList(r.data));
  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    try {
      await accounts.create({ ...form, balance: +form.balance, initial_balance: +form.initial_balance, profit_target: +form.profit_target, max_drawdown: +form.max_drawdown });
      toast.success("Compte ajouté");
      setOpen(false); load();
    } catch { toast.error("Erreur"); }
  };

  const del = async (id) => {
    if (!window.confirm("Supprimer le compte et ses trades ?")) return;
    await accounts.delete(id); toast.success("Supprimé"); load();
  };

  return (
    <div className="p-7 space-y-5">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold">Comptes</h1>
          <p className="text-sm text-[#9CA3AF] mt-1">Gère tous tes comptes funded en un seul endroit.</p>
        </div>
        <button onClick={() => setOpen(true)} className="btn-primary inline-flex items-center gap-2 text-sm py-2.5" data-testid="add-account-btn"><Plus className="w-4 h-4"/> Ajouter un compte</button>
      </div>

      {list.length === 0 ? (
        <div className="card-elev p-16 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#7C4DFF]/20 border border-[#7C4DFF]/30 flex items-center justify-center mb-4"><Plus className="w-6 h-6 text-[#B58BFF]"/></div>
          <div className="text-lg font-semibold">Ajoute ton premier compte funded</div>
          <div className="text-sm text-[#9CA3AF] mt-2">Topstep, Apex, FTMO, FundedNext et plus.</div>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map(a => {
            const pnl = a.balance - a.initial_balance;
            const targetPct = Math.min(100, Math.max(0, pnl / a.profit_target * 100));
            return (
              <div key={a.id} className="card-elev p-5" data-testid={`account-${a.id}`}>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-widest text-[#B58BFF]">{a.firm}</div>
                    <div className="text-lg font-semibold mt-1">{a.name}</div>
                  </div>
                  <button onClick={() => del(a.id)} className="text-[#6B7280] hover:text-[#FF5252]"><Trash2 className="w-4 h-4"/></button>
                </div>
                <div className="text-3xl font-bold font-mono">${a.balance.toLocaleString()}</div>
                <div className={`text-xs mt-1 ${pnl>=0?"text-[#00E676]":"text-[#FF5252]"}`}>{pnl>=0?"+":""}${pnl.toLocaleString()} P&L</div>

                <div className="mt-4">
                  <div className="flex justify-between text-[10px] text-[#9CA3AF] mb-1"><span>Objectif: ${a.profit_target.toLocaleString()}</span><span>{targetPct.toFixed(0)}%</span></div>
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden"><div className="h-full bg-gradient-to-r from-[#7C4DFF] to-[#4F8CFF]" style={{ width: `${targetPct}%` }} /></div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-4">
                  <div className="rounded-lg bg-black/30 border border-white/5 p-3">
                    <div className="text-[10px] text-[#9CA3AF] flex items-center gap-1 font-mono uppercase"><Shield className="w-3 h-3 text-[#00E676]"/>Health</div>
                    <div className="font-mono font-bold mt-1">{a.health_score}<span className="text-[10px] text-[#9CA3AF]">/100</span></div>
                  </div>
                  <div className="rounded-lg bg-black/30 border border-white/5 p-3">
                    <div className="text-[10px] text-[#9CA3AF] flex items-center gap-1 font-mono uppercase"><Activity className="w-3 h-3 text-[#4F8CFF]"/>Survival</div>
                    <div className="font-mono font-bold mt-1">{a.survival_score}<span className="text-[10px] text-[#9CA3AF]">%</span></div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2 text-[11px]">
                  <div className="text-[#9CA3AF]">Max DD: <span className="font-mono text-white">${a.max_drawdown.toLocaleString()}</span></div>
                  <div className="text-[#9CA3AF]">Initial: <span className="font-mono text-white">${a.initial_balance.toLocaleString()}</span></div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setOpen(false)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={create} className="card-elev p-8 w-full max-w-md space-y-4 glow-purple">
            <h2 className="text-2xl font-bold">Nouveau compte</h2>
            <Fld label="Nom du compte" value={form.name} onChange={(v)=>setForm({...form,name:v})} testid="acc-name" />
            <div>
              <label className="text-xs font-mono uppercase text-[#9CA3AF]">Prop firm</label>
              <select value={form.firm} onChange={(e)=>setForm({...form,firm:e.target.value})} data-testid="acc-firm" className="w-full mt-1 bg-[#0D1020] border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-[#7C4DFF]">
                {FIRMS.map(f => <option key={f}>{f}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Fld label="Solde ($)" type="number" value={form.balance} onChange={(v)=>setForm({...form,balance:v})} testid="acc-balance" />
              <Fld label="Solde initial ($)" type="number" value={form.initial_balance} onChange={(v)=>setForm({...form,initial_balance:v})} testid="acc-initial" />
              <Fld label="Profit target" type="number" value={form.profit_target} onChange={(v)=>setForm({...form,profit_target:v})} testid="acc-target" />
              <Fld label="Max drawdown" type="number" value={form.max_drawdown} onChange={(v)=>setForm({...form,max_drawdown:v})} testid="acc-dd" />
            </div>
            <button className="btn-primary w-full" data-testid="acc-submit">Créer le compte</button>
          </form>
        </div>
      )}
    </div>
  );
}

const Fld = ({ label, value, onChange, type="text", testid }) => (
  <div>
    <label className="text-xs font-mono uppercase text-[#9CA3AF]">{label}</label>
    <input type={type} required value={value} onChange={(e)=>onChange(e.target.value)} data-testid={testid} className="w-full mt-1 bg-[#0D1020] border border-white/10 rounded-xl px-4 py-2.5 font-mono outline-none focus:border-[#7C4DFF]" />
  </div>
);
