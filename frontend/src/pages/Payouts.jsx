import React, { useCallback, useEffect, useRef, useState } from "react";
import { payouts, accounts as accAPI, integrationConnections } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Banknote, Calendar, TrendingUp, Trash2, RefreshCw, X } from "lucide-react";
import { useAppSettings } from "@/hooks/useAppSettings";
import CsvExportButton from "@/components/CsvExportButton";
import { calculateSafeWithdrawal } from "@/lib/riskEngine";
import { localDateKey } from "@/lib/tradeCalendar";
import { listenForAppDataChanges } from "@/lib/appDataEvents";
import { useConfirmDialog } from "@/components/ConfirmDialog";
import { apiErrorMessage } from "@/lib/apiError";
import { formatMoney } from "@/lib/preferences";
import { payoutCurrency, payoutProjection, sumPayoutsByCurrency } from "@/lib/payoutMetrics";

export default function Payouts() {
  const { confirm, confirmationDialog } = useConfirmDialog();
  const { settings, money, date } = useAppSettings();
  const [list, setList] = useState([]);
  const [accs, setAccs] = useState([]);
  const [providerAccounts, setProviderAccounts] = useState({});
  const [open, setOpen] = useState(false);
  const today = localDateKey();
  const [form, setForm] = useState({ account_id: "", amount: 1000, date: today, note: "" });
  const [sim, setSim] = useState({ daily: 200, days: 20, target: 5000 });
  const [safeAccountId, setSafeAccountId] = useState("");
  const [safetyBuffer, setSafetyBuffer] = useState(20);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState("");
  const [error, setError] = useState("");
  const mutationPending = useRef(false);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const [p, a, connections] = await Promise.all([
      payouts.list(), accAPI.list(), integrationConnections.list().catch(() => ({ data: [] })),
    ]);
      const accountRows = a.data || [];
      setList(p.data || []); setAccs(accountRows);
      const linked = (connections.data || []).flatMap(connection => connection.integration_accounts || []);
      setProviderAccounts(Object.fromEntries(linked.filter(account => account.account_id).map(account => [account.account_id, account])));
      setForm(f => accountRows.some(account => account.id === f.account_id) ? f : ({ ...f, account_id: accountRows[0]?.id || "" }));
      setSafeAccountId(current => accountRows.some(account => account.id === current) ? current : accountRows[0]?.id || "");
    } catch (e) { setError(apiErrorMessage(e,"Impossible de charger les payouts.")); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); return listenForAppDataChanges(load, ["accounts", "trades", "payouts", "dashboard"]); }, [load]);

  const create = async (e) => {
    e.preventDefault();
    if (mutationPending.current) return;
    const selectedAccount = accs.find(account => account.id === form.account_id);
    if (!selectedAccount) return toast.error("Choisis un compte existant");
    const payload = { ...form, amount: Number(form.amount) };
    if (!Number.isFinite(payload.amount) || payload.amount <= 0) return toast.error("Indique un montant positif valide");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(payload.date) || Number.isNaN(new Date(`${payload.date}T12:00:00Z`).getTime())
      || new Date(`${payload.date}T12:00:00Z`).toISOString().slice(0, 10) !== payload.date) return toast.error("Indique une date valide");
    mutationPending.current = true;
    setSaving(true);
    try {
      const safety = providerAccounts[selectedAccount.id]?.status === "error" ? null : calculateSafeWithdrawal(selectedAccount, safetyBuffer, { allowStaticEstimate: !providerAccounts[selectedAccount.id] });
      const accountMoney = value => formatMoney(value, { settings, currency: payoutCurrency(selectedAccount, providerAccounts[selectedAccount.id]) });
      if (!safety || payload.amount > safety.safeAmount) {
        const accepted = await confirm({
          title: safety ? "Retrait supérieur à l’estimation prudente" : "Estimation de retrait indisponible",
          description: safety
            ? `Ce retrait dépasse l’estimation de sécurité (${accountMoney(safety.safeAmount)}). Les règles exactes de ta prop firm ne sont pas vérifiées automatiquement.`
            : "Le solde, le capital initial ou le seuil de drawdown ne permettent pas une estimation fiable. Cet enregistrement ne déclenche aucun retrait et ne valide pas ton éligibilité.",
          confirmLabel: "Continuer malgré tout",
        });
        if (!accepted) return;
      }
      await payouts.create(payload);
      toast.success("Payout enregistré"); setOpen(false); setForm(f=>({...f,amount:1000,note:"",date:today})); await load();
    } catch (e) { toast.error(apiErrorMessage(e,"Enregistrement impossible")); }
    finally { mutationPending.current = false; setSaving(false); }
  };
  const remove = async (payout) => {
    if (mutationPending.current) return;
    mutationPending.current = true;
    setDeleting(payout.id);
    try {
      const account = accs.find(item => item.id === payout.account_id);
      const amount = formatMoney(payout.amount, { settings, currency: payoutCurrency(account, providerAccounts[payout.account_id], payout) });
      const accepted = await confirm({ title: "Supprimer ce payout ?", description: `Le payout de ${amount} sera supprimé définitivement.`, confirmLabel: "Supprimer", destructive: true });
      if (!accepted) return;
      await payouts.delete(payout.id); toast.success("Payout supprimé"); await load();
    } catch (e) { toast.error(apiErrorMessage(e,"Suppression impossible")); }
    finally { mutationPending.current = false; setDeleting(""); }
  };

  const projection = payoutProjection(sim.daily, sim.days, sim.target);
  const safeAccount = accs.find(account => account.id === safeAccountId);
  const safeCurrency = payoutCurrency(safeAccount, providerAccounts[safeAccountId]);
  const formAccount = accs.find(account => account.id === form.account_id);
  const formCurrency = payoutCurrency(formAccount, providerAccounts[form.account_id]);
  const safeMoney = value => value == null ? "—" : formatMoney(value, { settings, currency: safeCurrency });
  const safeWithdrawal = providerAccounts[safeAccountId]?.status === "error" ? null : calculateSafeWithdrawal(safeAccount, safetyBuffer, { allowStaticEstimate: !providerAccounts[safeAccountId] });
  const payoutTotals = Object.entries(sumPayoutsByCurrency(list, accs, providerAccounts));
  const totalWithdrawn = payoutTotals.length ? payoutTotals.map(([currency, amount]) => formatMoney(amount, { settings, currency })).join(" · ") : formatMoney(0, { settings, currency: "USD" });
  const payoutExportRows = list.map((payout) => {
    const account = accs.find((item) => item.id === payout.account_id);
    return { ...payout, currency: payoutCurrency(account, providerAccounts[payout.account_id], payout), account_name: account?.name || "", account_firm: account?.firm || "" };
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

      {!loading && (!error || accs.length > 0 || list.length > 0) && <div className="grid sm:grid-cols-3 gap-4">
        <Stat label="Total retiré par devise" value={totalWithdrawn} color="#46C99A" icon={Banknote} />
        <Stat label="Scénario de profit saisi" value={projection ? money(projection.estimated) : "—"} color="#B58BFF" icon={TrendingUp} />
        <Stat label="Payouts enregistrés" value={list.length} color="#4F8CFF" icon={Calendar} />
      </div>}

      {/* Simulator */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="pe-card pe-card-pad space-y-6">
          <div><div className="pe-section-title">Retrait prudent par compte</div><p className="pe-page-copy mt-1">Estimation plafonnée au bénéfice au-dessus du capital initial, en {safeCurrency}. Elle ne valide ni l’éligibilité, ni le partage des profits, ni les règles exactes de la prop firm.</p></div>
          {accs.length ? <>
            <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs text-[#9CA3AF]">Compte<select value={safeAccountId} onChange={event=>setSafeAccountId(event.target.value)} className="pe-control mt-1 w-full"><option value="">Choisir un compte</option>{accs.map(account=><option key={account.id} value={account.id}>{account.firm} — {account.name}</option>)}</select></label><Fld label="Marge de sécurité (%)" type="number" min="0" max="100" value={safetyBuffer} onChange={setSafetyBuffer} testid="safe-buffer" /></div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><SimOut label="Retrait prudent" value={safeMoney(safeWithdrawal?.safeAmount)} color="#46C99A"/><SimOut label="Solde projeté" value={safeMoney(safeWithdrawal?.projectedBalance)} color="#B58BFF"/><SimOut label="Plancher protégé" value={safeMoney(safeWithdrawal?.protectedFloor)} color="#FFB855"/><SimOut label="Marge drawdown" value={safeMoney(safeWithdrawal?.remainingDrawdown)} color="#4F8CFF"/></div>
            {!safeWithdrawal && <p role="status" className="text-xs text-[#FFB855]">Estimation indisponible : vérifie le solde, le capital initial, le seuil de drawdown et une marge entre 0 et 100 %.</p>}
            {safeWithdrawal?.source === "static_estimate" && <p className="text-xs text-[#9CA3AF]">Seuil fixe estimé depuis le capital initial. Si ta limite est suiveuse, renseigne son seuil actuel avant de te baser sur ce montant.</p>}
          </> : <div className="rounded-xl border border-dashed border-white/10 p-5 text-center text-xs text-[#7E8798]">Ajoute un compte pour calculer une estimation.</div>}
          <div className="border-t border-white/[0.07] pt-5"><div className="text-sm font-semibold mb-2">Projection d’objectif</div><p className="pe-page-copy mb-4">Scénario manuel en {settings.currency}, sans prévision de performance ni estimation d’un payout éligible.</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Fld label="Profit / jour" type="number" min="0" step="any" value={sim.daily} onChange={(v)=>setSim({...sim,daily:v})} testid="sim-daily" />
            <Fld label="Jours restants" type="number" min="0" max="3650" step="1" value={sim.days} onChange={(v)=>setSim({...sim,days:v})} testid="sim-days" />
            <Fld label={`Objectif (${settings.currency})`} type="number" min="0" step="any" value={sim.target} onChange={(v)=>setSim({...sim,target:v})} testid="sim-target" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
            <SimOut label="Estimé" value={projection ? money(projection.estimated) : "—"} color="#46C99A" />
            <SimOut label="Date estimée" value={projection ? date(projection.estimatedDate) : "—"} color="#B58BFF" />
            <SimOut label="Écart objectif" value={projection ? money(projection.gap,{signDisplay:"always"}) : "—"} color={projection?.gap>=0?"#46C99A":"#F26A70"} />
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
                  <div className="flex items-center gap-3"><div className="text-lg font-bold font-numeric text-[#46C99A]">{formatMoney(p.amount,{settings,currency:payoutCurrency(accs.find(account=>account.id===p.account_id),providerAccounts[p.account_id],p),signDisplay:"always"})}</div><button disabled={deleting===p.id} onClick={()=>remove(p)} aria-label="Supprimer le payout" className="text-[#6B7280] hover:text-[#F26A70] disabled:opacity-40"><Trash2 className="w-4 h-4"/></button></div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={()=>setOpen(false)}>
          <form data-motion-item data-motion-surface onClick={(e)=>e.stopPropagation()} onSubmit={create} className="pe-card pe-card-pad w-full max-w-md space-y-4 glow-green max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between"><h2 className="pe-section-title">Enregistrer un payout</h2><button type="button" onClick={()=>setOpen(false)} aria-label="Fermer" className="pe-icon-button"><X className="w-4 h-4"/></button></div>
            <div>
              <label className="pe-field-label">Compte</label>
              <select value={form.account_id} onChange={(e)=>setForm({...form,account_id:e.target.value})} data-testid="p-account" className="pe-control mt-1 w-full">
                {accs.map(a => <option key={a.id} value={a.id}>{a.firm} — {a.name}</option>)}
              </select>
            </div>
            <p className="pe-page-copy">Cet historique ne déclenche aucun retrait auprès de ta prop firm.</p>
            <Fld label={`Montant (${formCurrency})`} type="number" min="0.01" step="any" value={form.amount} onChange={(v)=>setForm({...form,amount:v})} testid="p-amount" />
            <Fld label="Date" type="date" value={form.date} onChange={(v)=>setForm({...form,date:v})} testid="p-date" />
            <Fld label="Note" value={form.note} onChange={(v)=>setForm({...form,note:v})} testid="p-note" />
            <button disabled={saving || !form.account_id} className="btn-primary w-full disabled:opacity-50" data-testid="p-submit">{saving ? "Enregistrement…" : "Enregistrer"}</button>
          </form>
        </div>
      )}
      {confirmationDialog}
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
const Fld = ({ label, value, onChange, type="text", testid, min, max, step }) => (
  <div><label className="pe-field-label">{label}</label><input type={type} min={min} max={max} step={step} required value={value} onChange={(e)=>onChange(e.target.value)} data-testid={testid} className="pe-control mt-1.5 w-full font-numeric"/></div>
);
