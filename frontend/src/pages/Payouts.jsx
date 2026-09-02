import React, { useCallback, useEffect, useState } from "react";
import { payouts, accounts as accAPI, dashboard } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Banknote, Calendar, TrendingUp, Trash2, RefreshCw, X } from "lucide-react";
import { useAppSettings } from "@/hooks/useAppSettings";
import CsvExportButton from "@/components/CsvExportButton";
import { calculateSafeWithdrawal } from "@/lib/riskEngine";

export default function Payouts() {
  const { settings, money, date } = useAppSettings();
  const [list, setList] = useState([]);
  const [accs, setAccs] = useState([]);
  const [kpi, setKpi] = useState(null);
  const [open, setOpen] = useState(false);
  const today = new Date().toISOString().slice(0,10);
  const [form, setForm] = useState({ account_id: "", amount: 1000, date: today, note: "" });
  const [sim, setSim] = useState({ daily: 200, days: 20, target: 5000 });
  const [safeAccountId, setSafeAccountId] = useState("");
  const [safetyBuffer, setSafetyBuffer] = useState(20);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const [p, a, d] = await Promise.all([payouts.list(), accAPI.list(), dashboard()]);
      setList(p.data); setAccs(a.data); setKpi(d.data.kpis);
      if (a.data.length > 0) {
        setForm(f => f.account_id ? f : ({ ...f, account_id: a.data[0].id }));
        setSafeAccountId(current => current || a.data[0].id);
      }
    } catch (e) { setError(e.response?.data?.detail || "Impossible de charger les payouts."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const create = async (e) => {
    e.preventDefault();
    if (!form.account_id) return toast.error("Ajoute d’abord un compte");
    const selectedAccount = accs.find(account => account.id === form.account_id);
    const safety = calculateSafeWithdrawal(selectedAccount, safetyBuffer);
    if (safety && Number(form.amount) > safety.safeAmount && !window.confirm(`Ce retrait dépasse l’estimation de sécurité (${money(safety.safeAmount)}). Les règles exactes de ta prop firm ne sont pas vérifiées automatiquement. Continuer ?`)) return;
    setSaving(true);
    try {
      await payouts.create({ ...form, amount: +form.amount });
      toast.success("Payout enregistré"); setOpen(false); setForm(f=>({...f,amount:1000,note:"",date:today})); await load();
    } catch (e) { toast.error(e.response?.data?.detail || "Enregistrement impossible"); }
    finally { setSaving(false); }
  };
  const remove = async (payout) => {
    if (!window.confirm(`Supprimer le payout de ${money(payout.amount)} ?`)) return;
    setDeleting(payout.id);
    try { await payouts.delete(payout.id); toast.success("Payout supprimé"); await load(); }
    catch (e) { toast.error(e.response?.data?.detail || "Suppression impossible"); }
    finally { setDeleting(""); }
  };

  const estimated = +sim.daily * +sim.days;
  const gap = estimated - Number(sim.target || 0);
  const safeAccount = accs.find(account => account.id === safeAccountId);
  const safeWithdrawal = calculateSafeWithdrawal(safeAccount, safetyBuffer);
  const payoutExportRows = list.map((payout) => {
    const account = accs.find((item) => item.id === payout.account_id);
    return { ...payout, account_name: account?.name || "", account_firm: account?.firm || "" };
  });

  return (
    <div className="pe-page pe-page-stack mx-auto max-w-[1800px]">
      <div className="pe-page-header">
        <div>
          <div className="pe-eyebrow">Retraits et objectifs</div>
          <h1 className="pe-page-title mt-2">Payouts</h1>
          <p className="pe-page-copy mt-1">Suis tes retraits et projette ton prochain payout.</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row"><CsvExportButton rows={payoutExportRows} type="payouts" filename="pipsevo-payouts" className="btn-ghost w-full py-2.5 text-sm sm:w-auto"/><button onClick={()=>accs.length ? setOpen(true) : toast.error("Ajoute d’abord un compte")} className="btn-primary inline-flex items-center justify-center gap-2 text-sm py-2.5 w-full sm:w-auto" data-testid="add-payout-btn"><Plus className="w-4 h-4"/> Enregistrer un payout</button></div>
      </div>
      {error && <div className="rounded-2xl border border-[#F26A70]/25 bg-[#F26A70]/10 p-4 text-sm text-[#FF8A8A] flex justify-between gap-3"><span>{error}</span><button onClick={load} className="inline-flex items-center gap-2 text-xs"><RefreshCw className="w-3.5 h-3.5"/>Réessayer</button></div>}
      {loading && <div className="grid sm:grid-cols-3 gap-4">{Array.from({length:3}).map((_,i)=><div key={i} className="h-28 pe-card animate-pulse"/>)}</div>}

      {!loading && <div className="grid sm:grid-cols-3 gap-4">
        <Stat label="Total retiré" value={money(kpi?.total_payouts||0)} color="#46C99A" icon={Banknote} />
        <Stat label="Prochain payout estimé" value={money(kpi?.estimated_payout||0)} color="#B58BFF" icon={TrendingUp} />
        <Stat label="Payouts enregistrés" value={list.length} color="#4F8CFF" icon={Calendar} />
      </div>}

      {/* Simulator */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="pe-card pe-card-pad space-y-6">
          <div><div className="pe-section-title">Retrait prudent par compte</div><p className="pe-page-copy mt-1">Estimation basée sur ton solde et ton drawdown configuré. Elle ne remplace pas les conditions d’éligibilité de la prop firm.</p></div>
          {accs.length ? <>
            <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs text-[#9CA3AF]">Compte<select value={safeAccountId} onChange={event=>setSafeAccountId(event.target.value)} className="pe-control mt-1 w-full"><option value="">Choisir un compte</option>{accs.map(account=><option key={account.id} value={account.id}>{account.firm} — {account.name}</option>)}</select></label><Fld label="Marge de sécurité (%)" type="number" value={safetyBuffer} onChange={setSafetyBuffer} testid="safe-buffer" /></div>
            {safeWithdrawal && <div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><SimOut label="Retrait prudent" value={money(safeWithdrawal.safeAmount)} color="#46C99A"/><SimOut label="Solde projeté" value={money(safeWithdrawal.projectedBalance)} color="#B58BFF"/><SimOut label="Plancher protégé" value={money(safeWithdrawal.protectedFloor)} color="#FFB855"/><SimOut label="Marge drawdown" value={money(safeWithdrawal.remainingDrawdown)} color="#4F8CFF"/></div>}
          </> : <div className="rounded-xl border border-dashed border-white/10 p-5 text-center text-xs text-[#7E8798]">Ajoute un compte pour calculer une estimation.</div>}
          <div className="border-t border-white/[0.07] pt-5"><div className="text-sm font-semibold mb-4">Projection d’objectif</div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Fld label="Profit / jour" value={sim.daily} onChange={(v)=>setSim({...sim,daily:v})} testid="sim-daily" />
            <Fld label="Jours restants" value={sim.days} onChange={(v)=>setSim({...sim,days:v})} testid="sim-days" />
            <Fld label={`Objectif (${settings.currency})`} value={sim.target} onChange={(v)=>setSim({...sim,target:v})} testid="sim-target" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
            <SimOut label="Estimé" value={money(estimated)} color="#46C99A" />
            <SimOut label="Date estimée" value={date(new Date(Date.now()+Number(sim.days)*86400000))} color="#B58BFF" />
            <SimOut label="Écart objectif" value={money(gap,{signDisplay:"always"})} color={gap>=0?"#46C99A":"#F26A70"} />
          </div>
          </div>
        </div>

        <div className="pe-card pe-card-pad">
          <div className="pe-section-title mb-4">Historique</div>
          {list.length === 0 ? <div className="pe-empty-state py-10">Pas encore de payout</div> : (
            <div className="space-y-1">
              {list.map(p => (
                <div key={p.id} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0" data-testid={`payout-${p.id}`}>
                  <div className="flex items-center gap-3"><Banknote className="w-4 h-4 text-[#46C99A]"/><div><div className="text-sm">{date(p.date)}</div><div className="text-xs text-[#9CA3AF]">{p.note || "—"}</div></div></div>
                  <div className="flex items-center gap-3"><div className="text-lg font-bold font-numeric text-[#46C99A]">{money(p.amount,{signDisplay:"always"})}</div><button disabled={deleting===p.id} onClick={()=>remove(p)} aria-label="Supprimer le payout" className="text-[#6B7280] hover:text-[#F26A70] disabled:opacity-40"><Trash2 className="w-4 h-4"/></button></div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={()=>setOpen(false)}>
          <form onClick={(e)=>e.stopPropagation()} onSubmit={create} className="pe-card pe-card-pad w-full max-w-md space-y-4 glow-green max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between"><h2 className="pe-section-title">Enregistrer un payout</h2><button type="button" onClick={()=>setOpen(false)} aria-label="Fermer" className="pe-icon-button"><X className="w-4 h-4"/></button></div>
            <div>
              <label className="pe-field-label">Compte</label>
              <select value={form.account_id} onChange={(e)=>setForm({...form,account_id:e.target.value})} data-testid="p-account" className="pe-control mt-1 w-full">
                {accs.map(a => <option key={a.id} value={a.id}>{a.firm} — {a.name}</option>)}
              </select>
            </div>
            <Fld label={`Montant (${settings.currency})`} type="number" value={form.amount} onChange={(v)=>setForm({...form,amount:v})} testid="p-amount" />
            <Fld label="Date" type="date" value={form.date} onChange={(v)=>setForm({...form,date:v})} testid="p-date" />
            <Fld label="Note" value={form.note} onChange={(v)=>setForm({...form,note:v})} testid="p-note" />
            <button disabled={saving || !form.account_id} className="btn-primary w-full disabled:opacity-50" data-testid="p-submit">{saving ? "Enregistrement…" : "Enregistrer"}</button>
          </form>
        </div>
      )}
    </div>
  );
}

const Stat = ({ label, value, color, icon: Icon }) => (
  <div className="pe-card pe-card-pad">
    <div className="flex justify-between"><div className="text-pe-caption text-[#9CA3AF]">{label}</div><Icon className="w-4 h-4" style={{color}}/></div>
    <div className="text-3xl font-bold font-numeric mt-2" style={{color}}>{value}</div>
  </div>
);
const SimOut = ({ label, value, color }) => (
  <div className="card-flat p-3"><div className="pe-metric-label">{label}</div><div className="font-numeric font-bold mt-1" style={{color}}>{value}</div></div>
);
const Fld = ({ label, value, onChange, type="text", testid }) => (
  <div><label className="pe-field-label">{label}</label><input type={type} required value={value} onChange={(e)=>onChange(e.target.value)} data-testid={testid} className="pe-control mt-1.5 w-full font-numeric"/></div>
);
