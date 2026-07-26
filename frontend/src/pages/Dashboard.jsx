import React, { useEffect, useState } from "react";
import { dashboard, trades, accounts as accAPI } from "@/lib/api";
import { Link } from "react-router-dom";
import { Plus, TrendingUp, Shield, Target, ArrowDownRight, Sparkles, Calendar, BarChart3, RefreshCw } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { useAuth } from "@/context/AuthContext";
import useAppSettings from "@/hooks/useAppSettings";
import CommercialBanner from "@/components/CommercialBanner";
import { DashboardKpiCard } from "@/components/dashboard/DashboardVisuals";

const EMPTY_KPIS = { funded_capital: 0, total_profit: 0, remaining_drawdown: 0, estimated_payout: 0, discipline_score: 0, trader_score: 0, total_payouts: 0, active_accounts: 0, total_trades: 0 };
const EMPTY_METRICS = { winrate: 0, profit_factor: 0, avg_win: 0, avg_loss: 0, plan_respect_rate: 0 };

export default function Dashboard() {
  const { user } = useAuth();
  const { money } = useAppSettings();
  const [d, setD] = useState(null);
  const [recent, setRecent] = useState([]);
  const [accs, setAccs] = useState([]);
  const [tab, setTab] = useState("Tous");
  const [period, setPeriod] = useState("30");
  const [accountFilter, setAccountFilter] = useState("");
  const [assetFilter, setAssetFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true); setError("");
    try {
      const [dashResponse, tradeResponse, accountResponse] = await Promise.all([dashboard(), trades.list(), accAPI.list()]);
      setD(dashResponse.data); setRecent(tradeResponse.data); setAccs(accountResponse.data);
    } catch (e) { setError(e.response?.data?.detail || "Impossible de charger le tableau de bord."); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const k = d?.kpis || EMPTY_KPIS;
  const m = d?.metrics || EMPTY_METRICS;
  const cutoff = Date.now() - Number(period) * 86400000;
  const inPeriod = (item) => !item?.date || new Date(item.date).getTime() >= cutoff;
  const equityData = (d?.equity_curve || []).filter(inPeriod);
  const tradeList = recent.filter(inPeriod);
  const accList = accs;

  const filtered = tradeList.filter(t =>
    (!accountFilter || t.account_id === accountFilter) &&
    (!assetFilter || t.instrument === assetFilter) &&
    (tab === "Tous" || (tab === "Gagnants" ? t.pnl > 0 : t.pnl < 0))
  ).slice(0, 5);
  const isEmptyAccount = !loading && !accList.length && !recent.length;
  const payoutGoal = Number(accList[0]?.profit_target || Math.max(k.estimated_payout, 1000));
  const payoutProgress = Math.min(100, Math.round((Number(k.total_payouts || 0) / payoutGoal) * 100));
  const periodProfit = tradeList.reduce((sum,t)=>sum+Number(t.pnl||0),0);
  const periodWins = tradeList.filter(t=>Number(t.pnl)>0).length;
  const periodWinrate = tradeList.length ? Math.round(periodWins/tradeList.length*100) : 0;
  const insight = !k.total_trades ? "Ajoute tes premiers trades pour obtenir un insight personnalisé." : m.plan_respect_rate < 80 ? `Ton plan est respecté sur ${m.plan_respect_rate}% des trades. Priorité : réduire les prises hors plan.` : `Ton plan est respecté sur ${m.plan_respect_rate}% des trades. Continue à documenter chaque décision.`;

  return (
    <div className="p-4 sm:p-7 space-y-5 max-w-[1800px] mx-auto">
      <CommercialBanner placement="dashboard" />
      <div className="relative overflow-hidden rounded-[24px] border border-white/[0.08] bg-gradient-to-br from-[#111426] via-[#0B0E1A] to-[#090B13] p-5 sm:p-7 shadow-[0_20px_70px_rgba(0,0,0,.32)]">
        <div className="absolute -top-32 right-[8%] w-80 h-80 rounded-full bg-[#7C4DFF] blur-3xl opacity-15"/><div className="absolute -bottom-36 left-[25%] w-72 h-72 rounded-full bg-[#4F8CFF] blur-3xl opacity-10"/>
        <div className="relative flex flex-col xl:flex-row xl:items-center justify-between gap-5">
          <div><div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[.2em] font-mono text-[#B58BFF]"><span className="w-1.5 h-1.5 rounded-full bg-[#00E676] shadow-[0_0_10px_#00E676]"/>Centre de pilotage</div><h1 className="text-2xl sm:text-4xl font-bold mt-3">Bonjour {user?.name?.split(" ")[0] || "Trader"}<span className="text-[#B58BFF]">.</span></h1><p className="text-sm text-[#9CA3AF] mt-2">Garde le contrôle de ton risque, de ta discipline et de tes prochains objectifs.</p></div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3 min-w-0 xl:min-w-[420px]">{[["Capital suivi",money(k.funded_capital),"#4F8CFF"],["Score trader",`${k.trader_score || k.discipline_score}/100`,"#B58BFF"],["Payouts",money(k.total_payouts),"#00E676"]].map(([l,v,c])=><div key={l} className="rounded-2xl border border-white/[0.07] bg-black/20 p-3 sm:p-4 backdrop-blur"><div className="text-[9px] text-[#6B7280] uppercase tracking-wider">{l}</div><div className="text-sm sm:text-xl font-bold font-numeric mt-2 truncate" style={{color:c}}>{v}</div></div>)}</div>
        </div>
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-6 pt-5 border-t border-white/[0.06]">
          {isEmptyAccount ? <div className="text-[11px] text-[#B58BFF] inline-flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#B58BFF]"/>Ton espace est prêt : ajoute un compte puis journalise ton premier trade.</div> : <div className="text-[11px] text-[#00E676] inline-flex items-center gap-2"><Shield className="w-3.5 h-3.5"/>Données réelles synchronisées avec ton journal.</div>}
          <div className="flex items-center gap-2 flex-wrap">
          <label className="card-flat px-3 py-2 text-sm flex items-center gap-2"><Calendar className="w-3.5 h-3.5 text-[#9CA3AF]"/><select value={period} onChange={e=>setPeriod(e.target.value)} className="bg-transparent"><option value="7">7 derniers jours</option><option value="30">30 derniers jours</option><option value="90">90 derniers jours</option></select></label>
          <Link to="/app/markets" className="card-flat px-3 py-2 text-sm inline-flex items-center gap-2 hover:border-[#7C4DFF]/40"><BarChart3 className="w-4 h-4 text-[#B58BFF]"/> Marchés</Link>
          <Link to="/app/accounts?new=1" className="btn-primary inline-flex items-center gap-2 text-sm py-2.5" data-testid="dash-add-account"><Plus className="w-4 h-4"/> Ajouter un compte</Link>
          </div>
        </div>
      </div>

      {error && <div className="rounded-2xl border border-[#FF5252]/25 bg-[#FF5252]/10 p-4 text-sm text-[#FF8A8A] flex flex-col sm:flex-row sm:items-center justify-between gap-3"><span>{error}</span><button onClick={load} className="inline-flex items-center gap-2 rounded-lg border border-[#FF5252]/20 px-3 py-2 text-xs hover:bg-[#FF5252]/10"><RefreshCw className="w-3.5 h-3.5"/>Réessayer</button></div>}
      {loading && <div className="grid grid-cols-2 md:grid-cols-5 gap-3">{Array.from({length:5}).map((_,i)=><div key={i} className="h-40 rounded-2xl bg-white/[0.035] animate-pulse"/>)}</div>}

      {!loading && <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <DashboardKpiCard label="Profit net" value={money(periodProfit,{signDisplay:"always"})} sub={`Sur les ${period} derniers jours`} sparkColor={periodProfit < 0 ? "red" : "green"} icon={TrendingUp} testid="kpi-profit" />
        <DashboardKpiCard label="Score de discipline" value={<><span>{k.discipline_score}</span><span className="text-[#9CA3AF] text-base"> /100</span></>} sub={`${m.plan_respect_rate}% du plan respecté`} sparkColor="purple" icon={BarChart3} testid="kpi-discipline" />
        <DashboardKpiCard label="Comptes actifs" value={k.active_accounts} sub={`${k.active_accounts} compte${k.active_accounts>1?"s":""} suivi${k.active_accounts>1?"s":""}`} sparkColor="blue" icon={Shield} testid="kpi-accounts" />
        <DashboardKpiCard label="Win Rate" value={`${periodWinrate}%`} sub={`${tradeList.length} trades sur la période`} sparkColor="green" icon={Target} testid="kpi-winrate" />
        <DashboardKpiCard label="Drawdown restant" value={money(k.remaining_drawdown)} sub="Marge de risque disponible" sparkColor="red" icon={ArrowDownRight} testid="kpi-dd" />
      </div>}

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card-elev p-5 lg:col-span-2">
          <div className="flex justify-between items-center">
            <div className="text-sm font-semibold">Courbe d'équité</div>
            <select value={period} onChange={e=>setPeriod(e.target.value)} className="text-xs bg-[#0D1020] text-[#9CA3AF] px-2.5 py-1 rounded-lg border border-white/5"><option value="7">7 jours</option><option value="30">30 jours</option><option value="90">90 jours</option></select>
          </div>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={equityData}>
                <defs><linearGradient id="eqfill-d" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7C4DFF" stopOpacity="0.55"/><stop offset="100%" stopColor="#7C4DFF" stopOpacity="0"/></linearGradient></defs>
                <XAxis dataKey="date" stroke="#6B7280" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#6B7280" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v)=>money(v,{maximumFractionDigits:0})} />
                <Tooltip contentStyle={{ background: "#0F1117", border: "1px solid #1E2430", borderRadius: 12, fontSize: 12 }} />
                <Area type="monotone" dataKey="equity" stroke="#B58BFF" strokeWidth={2.4} fill="url(#eqfill-d)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div className="card-elev p-5">
            <div className="text-sm font-semibold mb-3">Progression des payouts</div>
            <div className="text-xs text-[#9CA3AF]">{accList[0] ? `${accList[0].firm} · ${accList[0].name}` : "Aucun compte configuré"}</div>
            <div className="flex items-baseline gap-2 mt-2">
              <div className="text-2xl font-bold font-numeric">{money(k.total_payouts)}</div>
              <div className="text-xs text-[#9CA3AF]">/ {money(payoutGoal)}</div>
              <div className="ml-auto text-xs font-mono">{payoutProgress}%</div>
            </div>
            <div className="h-2 rounded-full bg-white/5 mt-2 overflow-hidden"><div className="h-full bg-gradient-to-r from-[#7C4DFF] to-[#4F8CFF] rounded-full" style={{ width: `${payoutProgress}%` }} /></div>
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
              <div><div className="text-xs text-[#9CA3AF]">Prochain payout estimé</div><div className="text-xl font-bold font-numeric mt-1">{money(k.estimated_payout)}</div></div>
              <Link to="/app/payouts" className="text-xs text-[#B58BFF] flex items-center gap-1.5 px-2 py-1 rounded-lg border border-white/5 hover:border-[#7C4DFF]/40"><Calendar className="w-3 h-3"/>Simuler</Link>
            </div>
          </div>
          <div className="card-elev p-5">
            <div className="text-sm font-semibold mb-3">Répartition discipline</div>
            <div className="flex items-center justify-center"><BigGauge value={k.discipline_score} /></div>
            <Link to="/app/discipline" className="block text-center mt-2 text-xs text-[#B58BFF]" data-testid="dash-discipline-link">Détails →</Link>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card-elev overflow-hidden lg:col-span-2">
          <div className="p-4 sm:p-5 border-b border-white/[0.06] bg-gradient-to-r from-white/[0.025] to-transparent">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5"><div className="text-sm font-semibold">Trades récents</div><span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[10px] font-mono text-[#9CA3AF]">{filtered.length} affichés</span></div>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
                <select value={accountFilter} onChange={e=>setAccountFilter(e.target.value)} className="min-w-0 text-xs bg-[#0D1020] text-[#B5BBC9] px-2.5 py-2 rounded-xl border border-white/[0.08] outline-none focus:border-[#7C4DFF]/60"><option value="">Tous les comptes</option>{accList.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select>
                <select value={assetFilter} onChange={e=>setAssetFilter(e.target.value)} className="min-w-0 text-xs bg-[#0D1020] text-[#B5BBC9] px-2.5 py-2 rounded-xl border border-white/[0.08] outline-none focus:border-[#7C4DFF]/60"><option value="">Tous les actifs</option>{[...new Set(tradeList.map(t=>t.instrument))].filter(Boolean).map(x=><option key={x}>{x}</option>)}</select>
              </div>
            </div>
          </div>
          <div className="px-4 sm:px-5 pt-4"><div className="inline-flex gap-1 rounded-xl border border-white/[0.06] bg-[#090B13] p-1 text-xs">{["Tous","Gagnants","Perdants"].map(t => <button key={t} onClick={()=>setTab(t)} data-testid={`tab-${t}`} className={`rounded-lg px-3 py-1.5 transition ${tab===t ? "bg-[#7C4DFF]/20 text-white shadow-[inset_0_0_0_1px_rgba(124,77,255,.35)]" : "text-[#7E8798] hover:text-white"}`}>{t}</button>)}</div></div>

          <div className="md:hidden p-4 space-y-2">
            {filtered.map(t => {
              const hasPnl = typeof t.pnl === "number"; const positive = hasPnl && t.pnl >= 0;
              const directionLong = String(t.direction).toLowerCase() === "long";
              const accountName = t.account || accList.find(a=>a.id===t.account_id)?.firm || "Compte";
              return <div key={t.id} className="rounded-2xl border border-white/[0.07] bg-[#0B0E17] p-4 transition active:border-[#7C4DFF]/40">
                <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3 min-w-0"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#15182A] text-xs font-bold text-[#B58BFF]">{String(t.instrument || "?").slice(0,2)}</span><div className="min-w-0"><div className="font-semibold truncate">{t.instrument}</div><div className="text-[11px] text-[#6B7280] mt-0.5">{t.date} · {accountName}</div></div></div><div className="text-right"><div className="font-numeric font-semibold" style={{color:!hasPnl?"#9CA3AF":positive?"#00E676":"#FF5252"}}>{hasPnl?money(t.pnl,{minimumFractionDigits:2,maximumFractionDigits:2,signDisplay:"always"}):"—"}</div><div className="text-[10px] text-[#6B7280] mt-0.5">{typeof t.r==="number"?`${t.r.toFixed(2)}R`:"—"}</div></div></div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.05]"><span className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${directionLong ? "bg-[#00E676]/10 text-[#00E676]" : "bg-[#FF5252]/10 text-[#FF7272]"}`}>{directionLong ? "Achat · Long" : "Vente · Short"}</span><span className="text-[11px] text-[#7E8798]">{t.duration || t.session || "—"}</span></div>
              </div>;
            })}
            {!filtered.length && <div className="rounded-2xl border border-dashed border-white/10 py-10 text-center"><BarChart3 className="w-5 h-5 text-[#6B7280] mx-auto"/><p className="text-sm text-[#9CA3AF] mt-2">Aucun trade pour ces filtres.</p></div>}
          </div>

          <div className="hidden md:block m-5 mt-4 overflow-x-auto rounded-2xl border border-white/[0.07] bg-[#090B13]">
            <table className="w-full text-sm min-w-[820px]">
              <thead className="bg-white/[0.025] text-[#71798A] text-[10px] uppercase tracking-[.12em] font-mono"><tr><th className="text-left px-4 py-3 font-normal">Date</th><th className="text-left px-3 font-normal">Actif</th><th className="text-left px-3 font-normal">Direction</th><th className="text-right px-3 font-normal">Résultat</th><th className="text-right px-3 font-normal">R Multiple</th><th className="text-left px-3 font-normal">Durée</th><th className="text-left px-3 font-normal">Compte</th><th className="text-left px-4 font-normal">Tags</th></tr></thead>
              <tbody>
                {filtered.map(t => {
                  const hasPnl = typeof t.pnl === "number"; const positive = hasPnl && t.pnl >= 0;
                  const directionLong = String(t.direction).toLowerCase() === "long";
                  return <tr key={t.id} className="group border-t border-white/[0.055] transition-colors hover:bg-white/[0.025]">
                    <td className="px-4 py-3.5 text-xs text-[#8B93A3] whitespace-nowrap">{t.date}</td>
                    <td className="px-3 font-semibold"><span className="inline-flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-lg bg-[#15182A] text-[9px] text-[#B58BFF] group-hover:bg-[#7C4DFF]/15">{String(t.instrument || "?").slice(0,2)}</span>{t.instrument}</span></td>
                    <td className="px-3"><span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-medium ${directionLong ? "bg-[#00E676]/10 text-[#00E676]" : "bg-[#FF5252]/10 text-[#FF7272]"}`}>{directionLong ? "Achat · Long" : "Vente · Short"}</span></td>
                    <td className="px-3 text-right font-numeric font-semibold" style={{ color: !hasPnl ? "#9CA3AF" : positive ? "#00E676" : "#FF5252" }}>{hasPnl?money(t.pnl,{minimumFractionDigits:2,maximumFractionDigits:2,signDisplay:"always"}):"—"}</td>
                    <td className="px-3 text-right font-numeric text-[#B5BBC9]">{typeof t.r==="number"?`${t.r.toFixed(2)}R`:"—"}</td>
                    <td className="px-3 text-xs text-[#8B93A3]">{t.duration || t.session || "—"}</td>
                    <td className="px-3 text-xs text-[#B5BBC9]"><span className="rounded-lg border border-white/[0.07] bg-white/[0.025] px-2 py-1">{t.account || (accList.find(a=>a.id===t.account_id)?.firm) || "—"}</span></td>
                    <td className="px-4 space-x-1">{(t.tags || (t.setup ? [t.setup] : [])).slice(0,2).map((tag,i) => <span key={i} className="text-[9px] px-2 py-1 rounded-md bg-[#7C4DFF]/10 text-[#C8AEFF] inline-block">{tag}</span>)}</td>
                  </tr>;
                })}
                {!filtered.length && <tr><td colSpan="8" className="py-12 text-center text-sm text-[#7E8798]">Aucun trade ne correspond aux filtres sélectionnés.</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="px-5 pb-5"><Link to="/app/journal" className="block rounded-xl border border-white/[0.07] py-2.5 text-center text-xs text-[#B58BFF] transition hover:bg-[#7C4DFF]/10 hover:text-white">Voir tous les trades →</Link></div>
        </div>

        <div className="space-y-4">
          <div className="card-elev p-5 glow-purple">
            <div className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="w-4 h-4 text-[#B58BFF]"/> AI Coach Insight</div>
            <p className="text-xs text-[#B5BBC9] mt-3 leading-relaxed">{insight}</p>
            <Link to="/app/coach" className="block text-center mt-4 text-xs btn-primary py-2" data-testid="dash-insight-link">Voir l'insight →</Link>
          </div>
          <div className="card-elev p-5 overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <div><div className="text-sm font-semibold">Comptes</div><div className="text-[10px] text-[#6B7280] mt-1">Santé et performance</div></div>
              <Link to="/app/accounts" className="text-xs text-[#B58BFF]">Voir tout</Link>
            </div>
            <div className="space-y-2">
            {accList.slice(0, 4).map(a => {
              const pnl = Number(a.balance || 0) - Number(a.initial_balance || 0);
              const health = Math.max(0, Math.min(100, Number(a.health_score ?? (pnl >= 0 ? 82 : 48))));
              return (
                <div key={a.id} className="rounded-xl border border-white/[0.065] bg-[#0A0D16] p-3 transition hover:border-white/[0.12]">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#15182A] text-[10px] font-bold text-[#B58BFF]">{String(a.firm || a.name || "C").slice(0,2).toUpperCase()}</span><div className="min-w-0"><div className="text-xs font-medium truncate">{a.name || a.firm}</div><div className="text-[9px] text-[#6B7280] truncate mt-0.5">{a.firm || "Compte de trading"}</div></div></div>
                    <div className="text-right shrink-0"><div className="text-xs font-numeric font-semibold" style={{ color: pnl >= 0 ? "#00E676" : "#FF5252" }}>{money(pnl,{signDisplay:"always"})}</div><div className="text-[9px] text-[#6B7280] mt-0.5">P&amp;L</div></div>
                  </div>
                  <div className="mt-3 flex items-center gap-2"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.05]"><div className="h-full rounded-full bg-gradient-to-r from-[#4F8CFF] to-[#7C4DFF]" style={{width:`${health}%`}}/></div><span className="w-7 text-right text-[9px] font-mono text-[#8B93A3]">{health}%</span></div>
                </div>
              );
            })}
            {!accList.length && <div className="rounded-xl border border-dashed border-white/10 py-8 text-center text-xs text-[#7E8798]">Aucun compte ajouté.</div>}
            </div>
            <Link to="/app/accounts" className="block text-center mt-4 text-xs text-[#B58BFF]">Gérer mes comptes →</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function BigGauge({ value }) {
  const pct = value / 100;
  return (
    <div className="relative w-44 h-28">
      <svg viewBox="0 0 200 110" className="w-full h-full">
        <defs><linearGradient id="bg-grad" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#00E676"/><stop offset="100%" stopColor="#7C4DFF"/></linearGradient></defs>
        <path d="M20 95 A75 75 0 0 1 180 95" stroke="#1E2430" strokeWidth="12" fill="none" strokeLinecap="round" />
        <path d="M20 95 A75 75 0 0 1 180 95" stroke="url(#bg-grad)" strokeWidth="12" fill="none" strokeLinecap="round" strokeDasharray="236" strokeDashoffset={236 - 236*pct} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
        <div className="text-3xl font-bold font-numeric">{value}<span className="text-sm text-[#9CA3AF]">/100</span></div>
        <div className="text-[10px] text-[#9CA3AF] mt-0.5">{value>=80?"Excellent":value>=60?"À consolider":value?"À améliorer":"En attente"}</div>
      </div>
    </div>
  );
}
