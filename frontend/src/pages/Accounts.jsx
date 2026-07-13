import React, { useCallback, useEffect, useMemo, useState } from "react";
import { accounts } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Activity, Edit3, Plus, RefreshCw, Shield, Trash2, X } from "lucide-react";
import { PROP_FIRMS, marketKeys } from "@/lib/journalPreferences";
import { useAppSettings } from "@/hooks/useAppSettings";

const blank = { name: "Combine", firm: "", market_type: "futures", balance: 50000, initial_balance: 50000, profit_target: 3000, max_drawdown: 2000, daily_loss_limit: 1000, status: "active" };

export default function Accounts() {
  const { user } = useAuth();
  const { settings, money } = useAppSettings();
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState("");
  const [error, setError] = useState("");
  const traderType = user?.trader_type || "futures";
  const availableFirms = useMemo(() => { const markets = marketKeys(traderType); return PROP_FIRMS.filter(f => f.markets.some(m=>markets.includes(m))); }, [traderType]);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const { data } = await accounts.list(); setList(data); if (new URLSearchParams(window.location.search).get("new")==="1") { setEditing(null); setForm({...blank,firm:availableFirms[0]?.name||"",market_type:traderType === "both" ? availableFirms[0]?.markets[0] || "futures" : traderType}); setOpen(true); window.history.replaceState({},"","/app/accounts"); } }
    catch (e) { setError(e.response?.data?.detail || "Impossible de charger les comptes."); }
    finally { setLoading(false); }
  }, [availableFirms, traderType]);
  useEffect(() => { load(); }, [load]);

  const showCreate = () => {
    setEditing(null); setForm({...blank, firm: availableFirms[0]?.name || "", market_type:traderType === "both" ? availableFirms[0]?.markets[0] || "futures" : traderType}); setOpen(true);
  };
  const showEdit = (account) => { setEditing(account); setForm({...account}); setOpen(true); };
  const close = () => { if (!saving) { setOpen(false); setEditing(null); } };
  const save = async (e) => {
    e.preventDefault(); setSaving(true);
    const payload = Object.fromEntries(Object.entries(form).map(([k,v])=>[["balance","initial_balance","profit_target","max_drawdown","daily_loss_limit"].includes(k) ? k : k, ["balance","initial_balance","profit_target","max_drawdown","daily_loss_limit"].includes(k) ? Number(v) : v]));
    if (payload.initial_balance <= 0 || payload.max_drawdown <= 0 || payload.profit_target <= 0) { toast.error("Les montants doivent être supérieurs à zéro"); setSaving(false); return; }
    try {
      if (editing) await accounts.update(editing.id, payload); else await accounts.create(payload);
      toast.success(editing ? "Compte mis à jour" : "Compte ajouté"); setOpen(false); setEditing(null); await load();
    } catch (e) { toast.error(e.response?.data?.detail || "Impossible d’enregistrer le compte"); }
    finally { setSaving(false); }
  };
  const remove = async (account) => {
    if (!window.confirm(`Supprimer « ${account.name} » et tous ses trades ? Cette action est définitive.`)) return;
    setDeleting(account.id);
    try { await accounts.delete(account.id); toast.success("Compte supprimé"); await load(); }
    catch (e) { toast.error(e.response?.data?.detail || "Suppression impossible"); }
    finally { setDeleting(""); }
  };

  return <div className="max-w-[1500px] mx-auto p-4 sm:p-7 space-y-5">
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3"><div><div className="text-[10px] font-mono uppercase tracking-[.18em] text-[#B58BFF]">Portefeuille funded</div><h1 className="mt-2 text-2xl sm:text-3xl font-bold">Comptes</h1><p className="text-sm text-[#9CA3AF] mt-1">Gère tes objectifs, ton drawdown et la santé de chaque compte.</p></div><button onClick={showCreate} className="btn-primary inline-flex items-center justify-center gap-2 text-sm py-2.5 w-full sm:w-auto" data-testid="add-account-btn"><Plus className="w-4 h-4"/>Ajouter un compte</button></div>
    {error && <div className="rounded-2xl border border-[#FF5252]/25 bg-[#FF5252]/10 p-4 text-sm text-[#FF8A8A] flex justify-between items-center gap-3"><span>{error}</span><button onClick={load} className="inline-flex items-center gap-2 rounded-lg border border-[#FF5252]/20 px-3 py-2 text-xs"><RefreshCw className="w-3.5 h-3.5"/>Réessayer</button></div>}
    {loading ? <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({length:3}).map((_,i)=><div key={i} className="h-64 card-elev animate-pulse"/>)}</div> : list.length === 0 ? <div className="card-elev px-5 py-16 text-center"><div className="w-14 h-14 mx-auto rounded-2xl bg-[#7C4DFF]/20 border border-[#7C4DFF]/30 flex items-center justify-center mb-4"><Plus className="w-6 h-6 text-[#B58BFF]"/></div><div className="text-lg font-semibold">Ajoute ton premier compte funded</div><div className="text-sm text-[#9CA3AF] mt-2">La liste proposée correspond à ton profil {user?.trader_type === "cfd" ? "CFD / Forex" : user?.trader_type === "both" ? "Futures et CFD / Forex" : "Futures"}.</div><button onClick={showCreate} className="btn-primary mt-5">Configurer un compte</button></div> :
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{list.map(a => { const pnl=Number(a.balance)-Number(a.initial_balance); const targetPct=Math.min(100,Math.max(0,pnl/Math.max(Number(a.profit_target),1)*100)); const ddUsed=Math.max(0,Number(a.initial_balance)-Number(a.balance)); return <article key={a.id} className="card-elev p-5" data-testid={`account-${a.id}`}>
        <div className="flex justify-between items-start gap-3"><div><div className="text-[10px] font-mono uppercase tracking-widest text-[#B58BFF]">{a.firm}</div><div className="text-lg font-semibold mt-1">{a.name}</div><span className="inline-flex mt-2 rounded-full bg-[#00E676]/10 px-2 py-1 text-[9px] text-[#00E676]">{a.status === "active" ? "Actif" : a.status}</span></div><div className="flex gap-1"><button onClick={()=>showEdit(a)} aria-label={`Modifier ${a.name}`} className="grid w-8 h-8 place-items-center rounded-lg text-[#7E8798] hover:bg-white/5 hover:text-white"><Edit3 className="w-4 h-4"/></button><button disabled={deleting===a.id} onClick={()=>remove(a)} aria-label={`Supprimer ${a.name}`} className="grid w-8 h-8 place-items-center rounded-lg text-[#7E8798] hover:bg-[#FF5252]/10 hover:text-[#FF5252] disabled:opacity-40"><Trash2 className="w-4 h-4"/></button></div></div>
        <div className="mt-5 text-3xl font-bold font-numeric">{money(a.balance)}</div><div className={`text-xs mt-1 font-numeric ${pnl>=0?"text-[#00E676]":"text-[#FF5252]"}`}>{money(pnl,{signDisplay:"always"})} P&amp;L</div>
        <div className="mt-5"><div className="flex justify-between text-[10px] text-[#9CA3AF] mb-1.5"><span>Objectif {money(a.profit_target)}</span><span>{targetPct.toFixed(0)}%</span></div><div className="h-2 rounded-full bg-white/5 overflow-hidden"><div className="h-full bg-gradient-to-r from-[#7C4DFF] to-[#4F8CFF]" style={{width:`${targetPct}%`}}/></div></div>
        <div className="grid grid-cols-2 gap-2 mt-4"><Metric icon={Shield} label="Santé" value={`${a.health_score ?? 0}/100`} color="#00E676"/><Metric icon={Activity} label="Survie" value={`${a.survival_score ?? 0}%`} color="#4F8CFF"/></div><div className="mt-3 flex justify-between text-[10px] text-[#7E8798]"><span>Drawdown utilisé</span><span className="font-numeric text-white">{money(ddUsed)} / {money(a.max_drawdown)}</span></div>
      </article>})}</div>}
    {open && <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={close}><form onClick={e=>e.stopPropagation()} onSubmit={save} className="card-elev p-5 sm:p-7 w-full max-w-lg space-y-4 max-h-[92vh] overflow-y-auto"><div className="flex justify-between items-center"><div><h2 className="text-xl font-bold">{editing ? "Modifier le compte" : "Nouveau compte"}</h2><p className="text-xs text-[#7E8798] mt-1">Les montants servent au calcul du risque et des objectifs.</p></div><button type="button" onClick={close} aria-label="Fermer" className="grid w-9 h-9 place-items-center rounded-xl hover:bg-white/5"><X className="w-4 h-4"/></button></div><Fld label="Nom du compte" value={form.name} onChange={v=>setForm({...form,name:v})}/><label className="block text-xs text-[#9CA3AF]">Prop firm<select required value={form.firm} onChange={e=>{const firm=availableFirms.find(item=>item.name===e.target.value);setForm({...form,firm:e.target.value,market_type:firm?.markets.includes(form.market_type)?form.market_type:firm?.markets[0]||form.market_type})}} className="w-full mt-2 bg-[#0D1020] border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-[#7C4DFF]">{availableFirms.map(f=><option key={f.name} value={f.name}>{f.name}</option>)}</select></label><label className="block text-xs text-[#9CA3AF]">Type de marché<select required value={form.market_type || "futures"} onChange={e=>setForm({...form,market_type:e.target.value})} className="w-full mt-2 bg-[#0D1020] border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-[#7C4DFF]">{(availableFirms.find(item=>item.name===form.firm)?.markets || marketKeys(traderType)).map(market=><option key={market} value={market}>{market === "futures" ? "Futures" : "CFD / Forex"}</option>)}</select></label><div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><Fld label={`Solde actuel (${settings.currency})`} type="number" min="0" value={form.balance} onChange={v=>setForm({...form,balance:v})}/><Fld label={`Solde initial (${settings.currency})`} type="number" min="1" value={form.initial_balance} onChange={v=>setForm({...form,initial_balance:v})}/><Fld label={`Profit target (${settings.currency})`} type="number" min="1" value={form.profit_target} onChange={v=>setForm({...form,profit_target:v})}/><Fld label={`Max drawdown (${settings.currency})`} type="number" min="1" value={form.max_drawdown} onChange={v=>setForm({...form,max_drawdown:v})}/><div className="sm:col-span-2"><Fld label={`Limite de perte quotidienne (${settings.currency})`} type="number" min="0" value={form.daily_loss_limit || 0} onChange={v=>setForm({...form,daily_loss_limit:v})}/></div></div><div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2"><button type="button" onClick={close} className="btn-ghost">Annuler</button><button disabled={saving} className="btn-primary disabled:opacity-50">{saving ? "Enregistrement…" : editing ? "Enregistrer les modifications" : "Créer le compte"}</button></div></form></div>}
  </div>;
}
const Metric=({icon:Icon,label,value,color})=><div className="rounded-xl bg-black/25 border border-white/[0.06] p-3"><div className="text-[9px] text-[#7E8798] uppercase flex items-center gap-1"><Icon className="w-3 h-3" style={{color}}/>{label}</div><div className="font-numeric font-bold mt-1">{value}</div></div>;
const Fld=({label,value,onChange,type="text",min})=><label className="block text-xs text-[#9CA3AF]">{label}<input type={type} min={min} required value={value} onChange={e=>onChange(e.target.value)} className="w-full mt-2 bg-[#0D1020] border border-white/10 rounded-xl px-4 py-3 font-numeric outline-none focus:border-[#7C4DFF]"/></label>;
