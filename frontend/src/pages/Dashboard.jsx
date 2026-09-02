import React, { useEffect, useState } from "react";
import { dashboard, trades, accounts as accAPI } from "@/lib/api";
import { Link } from "react-router-dom";
import { Plus, Sparkles, Calendar, BarChart3, RefreshCw } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, CartesianGrid, ReferenceLine, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { useAuth } from "@/context/AuthContext";
import useAppSettings from "@/hooks/useAppSettings";
import CommercialBanner from "@/components/CommercialBanner";

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
  const tradeList = recent.filter(inPeriod);
  const accList = accs;
  const scopedTrades = tradeList.filter(t =>
    (!accountFilter || t.account_id === accountFilter) &&
    (!assetFilter || t.instrument === assetFilter)
  );
  let runningEquity = 0;
  const equityData = [...scopedTrades]
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .map(t => ({ date: t.date, equity: Math.round((runningEquity += Number(t.pnl || 0)) * 100) / 100 }));
  const filtered = scopedTrades.filter(t =>
    (tab === "Tous" || (tab === "Gagnants" ? t.pnl > 0 : t.pnl < 0))
  ).slice(0, 5);
  const isEmptyAccount = !loading && !accList.length && !recent.length;
  const periodProfit = scopedTrades.reduce((sum,t)=>sum+Number(t.pnl||0),0);
  const closedScopedTrades = scopedTrades.filter(t => Number.isFinite(Number(t.pnl)) && !["open", "cancelled", "canceled"].includes(t.result_status));
  const scopedWins = closedScopedTrades.filter(t => Number(t.pnl) > 0);
  const scopedLosses = closedScopedTrades.filter(t => Number(t.pnl) < 0);
  const scopedWinrate = closedScopedTrades.length ? scopedWins.length / closedScopedTrades.length * 100 : 0;
  const scopedGrossProfit = scopedWins.reduce((sum, t) => sum + Number(t.pnl || 0), 0);
  const scopedGrossLoss = Math.abs(scopedLosses.reduce((sum, t) => sum + Number(t.pnl || 0), 0));
  const scopedProfitFactor = scopedGrossLoss ? scopedGrossProfit / scopedGrossLoss : 0;
  const planRateLabel = m.plan_respect_rate === null || m.plan_respect_rate === undefined ? "Non mesuré" : `${m.plan_respect_rate}%`;
  const insight = !k.total_trades
    ? "Ajoute tes premiers trades pour obtenir un insight personnalisé."
    : m.plan_respect_rate === null || m.plan_respect_rate === undefined
      ? "Renseigne le respect du plan sur tes prochains trades pour activer l’analyse de discipline."
      : m.plan_respect_rate < 80
        ? `Ton plan est respecté sur ${m.plan_respect_rate}% des trades renseignés. Priorité : réduire les prises hors plan.`
        : `Ton plan est respecté sur ${m.plan_respect_rate}% des trades renseignés. Continue à documenter chaque décision.`;
  const dailyData = Object.values(scopedTrades.reduce((days, trade) => {
    const date = trade.date || "—";
    days[date] ||= { date, pnl: 0 };
    days[date].pnl += Number(trade.pnl || 0);
    return days;
  }, {})).sort((a, b) => String(a.date).localeCompare(String(b.date))).slice(-7);
  const panel = "rounded-xl border border-white/[0.085] bg-[#141414]";
  const control = "h-9 rounded-lg border border-white/[0.1] bg-[#191919] px-3 text-xs text-[#C9CDD5] outline-none transition hover:border-white/[0.18] focus:border-[#7C67D9]";

  return (
    <div className="pe-page max-w-[1800px] mx-auto space-y-4">
      <CommercialBanner placement="dashboard" />
      <header className="flex flex-col gap-4 border-b border-white/[0.08] pb-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-[.16em] text-[#8071D8]">Aperçu · {user?.name?.split(" ")[0] || "Trader"}</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-[-.025em] text-[#F2F2F3] sm:text-3xl">Dashboard</h1>
          <p className="mt-1 text-xs text-[#777D88]">Performance, risque et discipline sur une seule vue.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
          <label className={`${control} flex items-center gap-2`}><Calendar className="h-3.5 w-3.5 text-[#777D88]"/><select value={period} onChange={e=>setPeriod(e.target.value)} className="min-w-0 bg-transparent"><option value="7">7 derniers jours</option><option value="30">30 derniers jours</option><option value="90">90 derniers jours</option></select></label>
          <select value={accountFilter} onChange={e=>setAccountFilter(e.target.value)} className={control}><option value="">Tous les comptes</option>{accList.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select>
          <select value={assetFilter} onChange={e=>setAssetFilter(e.target.value)} className={control}><option value="">Tous les actifs</option>{[...new Set(tradeList.map(t=>t.instrument))].filter(Boolean).map(x=><option key={x}>{x}</option>)}</select>
          <Link to="/app/accounts?new=1" className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[#6F56D9] px-3 text-xs font-semibold text-white transition hover:bg-[#7D64E4]" data-testid="dash-add-account"><Plus className="h-3.5 w-3.5"/>Ajouter un compte</Link>
        </div>
      </header>

      <div className="flex items-center gap-2 px-1 text-[11px] text-[#737985]">
        <span className={`h-1.5 w-1.5 rounded-full ${isEmptyAccount ? "bg-[#8071D8]" : "bg-[#3CB58B]"}`}/>
        {isEmptyAccount ? "Ajoute un compte pour commencer l’analyse." : "Données synchronisées avec ton journal."}
      </div>

      {error && <div className="rounded-2xl border border-[#FF5252]/25 bg-[#FF5252]/10 p-4 text-sm text-[#FF8A8A] flex flex-col sm:flex-row sm:items-center justify-between gap-3"><span>{error}</span><button onClick={load} className="inline-flex items-center gap-2 rounded-lg border border-[#FF5252]/20 px-3 py-2 text-xs hover:bg-[#FF5252]/10"><RefreshCw className="w-3.5 h-3.5"/>Réessayer</button></div>}
      {loading && <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">{Array.from({length:5}).map((_,i)=><div key={i} className="h-28 animate-pulse rounded-xl bg-white/[0.035]"/>)}</div>}

      {!loading && <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi label="P&L net" value={money(periodProfit,{signDisplay:"always"})} detail={`${scopedTrades.length} trades`} tone={periodProfit < 0 ? "negative" : "positive"} testid="kpi-profit" />
        <Kpi label="Win rate" value={`${scopedWinrate.toFixed(1)}%`} detail="Trades clôturés" />
        <Kpi label="Profit factor" value={scopedProfitFactor.toFixed(2)} detail="Gains / pertes" />
        <Kpi label="Discipline" value={`${k.discipline_score}/100`} detail={`${planRateLabel} · plan`} tone="accent" testid="kpi-discipline" />
        <Kpi label="Drawdown disponible" value={money(k.remaining_drawdown)} detail={`${k.active_accounts} compte${k.active_accounts>1?"s":""} actif${k.active_accounts>1?"s":""}`} testid="kpi-dd" />
      </div>}

      <div className="grid gap-3 xl:grid-cols-3">
        <section className={`${panel} overflow-hidden xl:col-span-2`}>
          <PanelHeader title="P&L cumulatif" detail={`${period} derniers jours`} />
          <div className="h-[270px] px-3 pb-3 pt-4 sm:px-5">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={equityData} margin={{top:8,right:8,left:0,bottom:0}}>
                <defs><linearGradient id="eqfill-d" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7964D6" stopOpacity="0.24"/><stop offset="100%" stopColor="#7964D6" stopOpacity="0"/></linearGradient></defs>
                <CartesianGrid vertical={false} stroke="rgba(255,255,255,.065)" strokeDasharray="3 4"/>
                <XAxis dataKey="date" tick={{fill:"#707681",fontSize:10}} tickLine={false} axisLine={false} />
                <YAxis width={58} tick={{fill:"#707681",fontSize:10}} tickLine={false} axisLine={false} tickFormatter={(v)=>money(v,{maximumFractionDigits:0})} />
                <Tooltip contentStyle={{ background: "#1A1A1A", border: "1px solid #343434", borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="equity" stroke="#8B79DD" strokeWidth={1.8} fill="url(#eqfill-d)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className={`${panel} overflow-hidden`}>
          <PanelHeader title="P&L journalier" detail="7 dernières séances" />
          <div className="h-[270px] px-3 pb-3 pt-4 sm:px-5"><ResponsiveContainer width="100%" height="100%"><BarChart data={dailyData} margin={{top:8,right:4,left:0,bottom:0}}><CartesianGrid vertical={false} stroke="rgba(255,255,255,.065)" strokeDasharray="3 4"/><XAxis dataKey="date" tick={{fill:"#707681",fontSize:9}} tickLine={false} axisLine={false}/><YAxis width={54} tick={{fill:"#707681",fontSize:10}} tickLine={false} axisLine={false} tickFormatter={v=>money(v,{maximumFractionDigits:0})}/><ReferenceLine y={0} stroke="rgba(255,255,255,.2)"/><Tooltip contentStyle={{background:"#1A1A1A",border:"1px solid #343434",borderRadius:8,fontSize:12}} formatter={value=>[money(value,{signDisplay:"always"}),"P&L"]}/><Bar dataKey="pnl" fill="#7964D6" radius={[3,3,0,0]} maxBarSize={42}/></BarChart></ResponsiveContainer></div>
        </section>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className={`${panel} overflow-hidden lg:col-span-2`}>
          <div className="border-b border-white/[0.07] p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5"><div className="text-sm font-semibold">Trades récents</div><span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[10px] font-mono text-[#9CA3AF]">{filtered.length} affichés</span></div>
              <Link to="/app/journal" className="text-xs text-[#9B8DE1] transition hover:text-white">Ouvrir le journal →</Link>
            </div>
          </div>
          <div className="border-b border-white/[0.06] px-4 sm:px-5"><div className="flex gap-5 text-xs">{["Tous","Gagnants","Perdants"].map(t => <button key={t} onClick={()=>setTab(t)} data-testid={`tab-${t}`} className={`border-b-2 py-3 transition ${tab===t ? "border-[#7B68D4] text-white" : "border-transparent text-[#777D88] hover:text-white"}`}>{t}</button>)}</div></div>

          <div className="md:hidden p-4 space-y-2">
            {filtered.map(t => {
              const hasPnl = typeof t.pnl === "number"; const positive = hasPnl && t.pnl >= 0;
              const directionLong = String(t.direction).toLowerCase() === "long";
              const accountName = t.account || accList.find(a=>a.id===t.account_id)?.firm || "Compte";
              return <div key={t.id} className="rounded-xl border border-white/[0.07] bg-[#181818] p-4 transition active:border-[#7C67D9]/40">
                <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3 min-w-0"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#15182A] text-xs font-bold text-[#B58BFF]">{String(t.instrument || "?").slice(0,2)}</span><div className="min-w-0"><div className="font-semibold truncate">{t.instrument}</div><div className="text-[11px] text-[#6B7280] mt-0.5">{t.date} · {accountName}</div></div></div><div className="text-right"><div className="font-numeric font-semibold" style={{color:!hasPnl?"#9CA3AF":positive?"#00E676":"#FF5252"}}>{hasPnl?money(t.pnl,{minimumFractionDigits:2,maximumFractionDigits:2,signDisplay:"always"}):"—"}</div><div className="text-[10px] text-[#6B7280] mt-0.5">{typeof t.r==="number"?`${t.r.toFixed(2)}R`:"—"}</div></div></div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.05]"><span className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${directionLong ? "bg-[#00E676]/10 text-[#00E676]" : "bg-[#FF5252]/10 text-[#FF7272]"}`}>{directionLong ? "Achat · Long" : "Vente · Short"}</span><span className="text-[11px] text-[#7E8798]">{t.duration || t.session || "—"}</span></div>
              </div>;
            })}
            {!filtered.length && <div className="rounded-2xl border border-dashed border-white/10 py-10 text-center"><BarChart3 className="w-5 h-5 text-[#6B7280] mx-auto"/><p className="text-sm text-[#9CA3AF] mt-2">Aucun trade pour ces filtres.</p></div>}
          </div>

          <div className="m-5 mt-4 hidden overflow-x-auto rounded-lg border border-white/[0.07] bg-[#111] md:block">
            <table className="pe-table min-w-[820px]">
              <thead><tr><th className="text-left">Date</th><th className="text-left">Actif</th><th className="text-left">Direction</th><th className="text-right">Résultat</th><th className="text-right">R Multiple</th><th className="text-left">Durée</th><th className="text-left">Compte</th><th className="text-left">Tags</th></tr></thead>
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
          <div className="px-5 pb-5"><Link to="/app/journal" className="block rounded-lg border border-white/[0.08] py-2.5 text-center text-xs text-[#AAA1D8] transition hover:border-white/[0.16] hover:text-white">Voir tous les trades →</Link></div>
        </div>

        <div className="space-y-4">
          <div className={`${panel} p-5`}>
            <div className="flex items-start justify-between gap-3">
              <div><div className="text-sm font-semibold">Répartition discipline</div><div className="mt-1 text-[10px] text-[#686E79]">Respect du plan sur les trades renseignés</div></div>
              <Link to="/app/discipline" className="text-[10px] text-[#9B8DE1] transition hover:text-white" data-testid="dash-discipline-link">Détails →</Link>
            </div>
            <div className="mt-5 flex items-end justify-between gap-4">
              <div className="font-numeric text-3xl font-semibold tracking-[-.03em] text-[#F0F0F1]">{k.discipline_score}<span className="ml-1 text-sm font-normal text-[#6F7580]">/100</span></div>
              <div className="text-right"><div className="font-numeric text-sm font-semibold text-[#A492F0]">{planRateLabel}</div><div className="mt-1 text-[9px] uppercase tracking-[.12em] text-[#626873]">Plan respecté</div></div>
            </div>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/[0.065]"><div className="h-full rounded-full bg-[#7B68D4] transition-[width] duration-500" style={{width:`${Math.max(0,Math.min(100,Number(k.discipline_score||0)))}%`}}/></div>
            <div className="mt-3 flex items-center justify-between text-[10px] text-[#6F7580]"><span>{k.total_trades || recent.length} trades suivis</span><span>{k.discipline_score >= 80 ? "Solide" : k.discipline_score >= 60 ? "À consolider" : k.discipline_score ? "À améliorer" : "En attente"}</span></div>
          </div>
          <div className={`${panel} p-5`}>
            <div className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="h-4 w-4 text-[#8F7DDE]"/>Atlas · aperçu</div>
            <p className="text-xs text-[#B5BBC9] mt-3 leading-relaxed">{insight}</p>
            <Link to="/app/coach" className="mt-4 block rounded-lg border border-white/[0.09] py-2 text-center text-xs text-[#AAA1D8] transition hover:border-white/[0.16] hover:text-white" data-testid="dash-insight-link">Ouvrir l’analyse →</Link>
          </div>
          <div className={`${panel} overflow-hidden p-5`}>
            <div className="flex items-center justify-between mb-3">
              <div><div className="text-sm font-semibold">Comptes</div><div className="text-[10px] text-[#6B7280] mt-1">Santé et performance</div></div>
              <Link to="/app/accounts" className="text-xs text-[#B58BFF]">Voir tout</Link>
            </div>
            <div className="space-y-2">
            {accList.slice(0, 4).map(a => {
              const pnl = Number(a.balance || 0) - Number(a.initial_balance || 0);
              const health = Math.max(0, Math.min(100, Number(a.health_score ?? (pnl >= 0 ? 82 : 48))));
              return (
                <div key={a.id} className="rounded-lg border border-white/[0.065] bg-[#191919] p-3 transition hover:border-white/[0.12]">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#15182A] text-[10px] font-bold text-[#B58BFF]">{String(a.firm || a.name || "C").slice(0,2).toUpperCase()}</span><div className="min-w-0"><div className="text-xs font-medium truncate">{a.name || a.firm}</div><div className="text-[9px] text-[#6B7280] truncate mt-0.5">{a.firm || "Compte de trading"}</div></div></div>
                    <div className="text-right shrink-0"><div className="text-xs font-numeric font-semibold" style={{ color: pnl >= 0 ? "#00E676" : "#FF5252" }}>{money(pnl,{signDisplay:"always"})}</div><div className="text-[9px] text-[#6B7280] mt-0.5">P&amp;L</div></div>
                  </div>
                  <div className="mt-3 flex items-center gap-2"><div className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.06]"><div className="h-full rounded-full bg-[#7B68D4]" style={{width:`${health}%`}}/></div><span className="w-7 text-right text-[9px] font-mono text-[#8B93A3]">{health}%</span></div>
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

function Kpi({ label, value, detail, tone = "neutral", testid }) {
  const colors = { positive: "text-[#46C99A]", negative: "text-[#F26A70]", accent: "text-[#A492F0]", neutral: "text-[#F2F2F3]" };
  return <div className="rounded-xl border border-white/[0.085] bg-[#141414] p-4" data-testid={testid}>
    <div className="text-[11px] text-[#858A94]">{label}</div>
    <div className={`mt-2 font-numeric text-xl font-semibold tracking-[-.02em] sm:text-2xl ${colors[tone]}`}>{value}</div>
    <div className="mt-2 text-[10px] text-[#646A75]">{detail}</div>
  </div>;
}

function PanelHeader({ title, detail }) {
  return <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3.5 sm:px-5">
    <h2 className="text-sm font-semibold text-[#E7E7E8]">{title}</h2>
    <span className="text-[10px] text-[#6F7580]">{detail}</span>
  </div>;
}
