import React, { useEffect, useMemo, useState } from "react";
import { dashboard, trades, accounts as accAPI } from "@/lib/api";
import { Link } from "react-router-dom";
import { Plus, Sparkles, Calendar, BarChart3, RefreshCw, ShieldCheck, WalletCards, ChevronLeft, ChevronRight, Flame, X, BookOpen } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, CartesianGrid, ReferenceLine, ResponsiveContainer, ScatterChart, Scatter, Cell, XAxis, YAxis, Tooltip } from "recharts";
import { useAuth } from "@/context/AuthContext";
import useAppSettings from "@/hooks/useAppSettings";
import CommercialBanner from "@/components/CommercialBanner";
import { DashboardTemplateManager } from "@/components/dashboard/DashboardTemplateManager";
import { DEFAULT_DASHBOARD_TEMPLATES, readDashboardTemplateState } from "@/lib/dashboardTemplates";
import { buildMonthCells, groupTradesByDate } from "@/lib/tradeCalendar";

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
  const [calendarMonth, setCalendarMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [selectedDay, setSelectedDay] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [templateState, setTemplateState] = useState(readDashboardTemplateState);

  const load = async () => {
    setLoading(true); setError("");
    try {
      const [dashResponse, tradeResponse, accountResponse] = await Promise.all([dashboard(), trades.list(), accAPI.list()]);
      setD(dashResponse.data); setRecent(tradeResponse.data); setAccs(accountResponse.data);
    } catch (e) { setError(e.response?.data?.detail || "Impossible de charger le tableau de bord."); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (!selectedDay) return undefined;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event) => { if (event.key === "Escape") setSelectedDay(null); };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [selectedDay]);

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
  const totalsByDay = scopedTrades.reduce((days, trade) => {
    const date = trade.date || "—";
    days[date] = (days[date] || 0) + Number(trade.pnl || 0);
    return days;
  }, {});
  const dailyTotals = Object.values(totalsByDay);
  const dayWinRate = dailyTotals.length ? dailyTotals.filter((pnl) => pnl > 0).length / dailyTotals.length * 100 : 0;
  const tradeStreak = calculateStreak([...closedScopedTrades].sort((a, b) => String(b.date).localeCompare(String(a.date))).map((trade) => Number(trade.pnl || 0)));
  const dayStreak = calculateStreak(Object.entries(totalsByDay).sort(([a], [b]) => String(b).localeCompare(String(a))).map(([, pnl]) => pnl));
  const drawdownLimit = accList.reduce((sum, account) => sum + Number(account.max_drawdown || 0), 0);
  const drawdownRate = drawdownLimit ? Number(k.remaining_drawdown || 0) / drawdownLimit * 100 : Number(k.remaining_drawdown || 0) > 0 ? 100 : 0;
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
  const calendarCells = useMemo(() => buildMonthCells(calendarMonth, groupTradesByDate(scopedTrades)), [calendarMonth, scopedTrades]);
  const calendarLabel = useMemo(() => {
    const [year, month] = calendarMonth.split("-").map(Number);
    return new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1));
  }, [calendarMonth]);
  const tradeTimeData = scopedTrades.map((trade) => ({ hour: tradeHour(trade), pnl: Number(trade.pnl || 0), instrument: trade.instrument })).filter((point) => point.hour !== null);
  const tradeDurationData = scopedTrades.map((trade) => ({ minutes: tradeDurationMinutes(trade), pnl: Number(trade.pnl || 0), instrument: trade.instrument })).filter((point) => point.minutes !== null);
  const templates = useMemo(() => [...DEFAULT_DASHBOARD_TEMPLATES, ...templateState.custom], [templateState.custom]);
  const activeTemplate = templates.find((template) => template.id === templateState.activeId) || DEFAULT_DASHBOARD_TEMPLATES[0];
  const visible = (widget) => activeTemplate.widgets.includes(widget);
  const accent = activeTemplate.accent === "blue" ? "#4F8DFF" : "#8067F4";
  const accentSoft = activeTemplate.accent === "blue" ? "rgba(79,141,255,.18)" : "rgba(128,103,244,.18)";
  const panel = "rounded-xl border border-[#6571CF]/20 bg-[#0D1120] shadow-[inset_0_1px_0_rgba(255,255,255,.025)]";
  const control = "h-9 rounded-lg border border-[#6971C9]/20 bg-[#0C1122] px-3 text-xs text-[#C9CDD5] outline-none transition hover:border-[#7780E0]/35 focus:border-[#8075ED]";

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
          <DashboardTemplateManager state={templateState} onChange={setTemplateState} />
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

      {error && <div className="rounded-2xl border border-[#F26A70]/25 bg-[#F26A70]/10 p-4 text-sm text-[#FF8A8A] flex flex-col sm:flex-row sm:items-center justify-between gap-3"><span>{error}</span><button onClick={load} className="inline-flex items-center gap-2 rounded-lg border border-[#F26A70]/20 px-3 py-2 text-xs hover:bg-[#F26A70]/10"><RefreshCw className="w-3.5 h-3.5"/>Réessayer</button></div>}
      {loading && <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">{Array.from({length:5}).map((_,i)=><div key={i} className="h-28 animate-pulse rounded-xl bg-white/[0.035]"/>)}</div>}

      {!loading && <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {visible("summary") && <Kpi label="P&L net" value={money(periodProfit,{signDisplay:"always"})} detail={`${scopedTrades.length} trades sur la période`} tone={periodProfit < 0 ? "negative" : "positive"} testid="kpi-profit" accent={accent} />}
        {visible("summary") && <GaugeKpi label="Win rate" value={scopedWinrate} display={`${scopedWinrate.toFixed(1)}%`} detail={`${scopedWins.length} gains · ${scopedLosses.length} pertes`} accent={accent} id="win-rate" />}
        {visible("summary") && <RingKpi label="Profit factor" value={Math.min(100, scopedProfitFactor / 3 * 100)} display={scopedProfitFactor.toFixed(2)} detail="Objectif solide : 1,50+" accent={accent} id="profit-factor" />}
        {visible("summary") && <GaugeKpi label="Jours gagnants" value={dayWinRate} display={`${dayWinRate.toFixed(0)}%`} detail={`${dailyTotals.filter((pnl) => pnl > 0).length} jours positifs`} accent={accent} id="day-win-rate" />}
        <GaugeKpi label="Drawdown disponible" value={drawdownRate} display={money(k.remaining_drawdown)} detail={`${k.active_accounts} compte${k.active_accounts>1?"s":""} actif${k.active_accounts>1?"s":""}`} accent={activeTemplate.accent === "blue" ? "#6D7CFF" : "#4F8DFF"} id="drawdown" testid="kpi-dd" amount />
        <StreakKpi dayStreak={dayStreak} tradeStreak={tradeStreak} accent={accent} />
      </div>}

      {(visible("equity") || visible("daily")) && <div className="grid gap-3 xl:grid-cols-3">
        {visible("equity") && <section className={`${panel} overflow-hidden ${visible("daily") ? "xl:col-span-2" : "xl:col-span-3"}`}>
          <PanelHeader title="P&L cumulatif" detail={`${period} derniers jours`} />
          <div className="h-[270px] px-3 pb-3 pt-4 sm:px-5">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={equityData} margin={{top:8,right:8,left:0,bottom:0}}>
                <defs><linearGradient id="eqfill-d" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={accent} stopOpacity="0.28"/><stop offset="100%" stopColor={accent} stopOpacity="0"/></linearGradient></defs>
                <CartesianGrid vertical={false} stroke="rgba(255,255,255,.065)" strokeDasharray="3 4"/>
                <XAxis dataKey="date" tick={{fill:"#707681",fontSize:10}} tickLine={false} axisLine={false} />
                <YAxis width={58} tick={{fill:"#707681",fontSize:10}} tickLine={false} axisLine={false} tickFormatter={(v)=>money(v,{maximumFractionDigits:0})} />
                <Tooltip contentStyle={{ background: "#0B1020", border: "1px solid rgba(112,119,218,.3)", borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="equity" stroke={accent} strokeWidth={2} fill="url(#eqfill-d)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>}

        {visible("daily") && <section className={`${panel} overflow-hidden ${visible("equity") ? "" : "xl:col-span-3"}`}>
          <PanelHeader title="P&L journalier" detail="7 dernières séances" />
          <div className="h-[270px] px-3 pb-3 pt-4 sm:px-5"><ResponsiveContainer width="100%" height="100%"><BarChart data={dailyData} margin={{top:8,right:4,left:0,bottom:0}}><CartesianGrid vertical={false} stroke="rgba(255,255,255,.065)" strokeDasharray="3 4"/><XAxis dataKey="date" tick={{fill:"#707681",fontSize:9}} tickLine={false} axisLine={false}/><YAxis width={54} tick={{fill:"#707681",fontSize:10}} tickLine={false} axisLine={false} tickFormatter={v=>money(v,{maximumFractionDigits:0})}/><ReferenceLine y={0} stroke="rgba(255,255,255,.2)"/><Tooltip contentStyle={{background:"#0B1020",border:"1px solid rgba(112,119,218,.3)",borderRadius:8,fontSize:12}} formatter={value=>[money(value,{signDisplay:"always"}),"P&L"]}/><Bar dataKey="pnl" fill={accent} radius={[3,3,0,0]} maxBarSize={42}/></BarChart></ResponsiveContainer></div>
        </section>}
      </div>}

      <TradeCalendarPanel
        cells={calendarCells}
        label={calendarLabel}
        accent={accent}
        money={money}
        onPrevious={() => setCalendarMonth(shiftMonth(calendarMonth, -1))}
        onNext={() => setCalendarMonth(shiftMonth(calendarMonth, 1))}
        onToday={() => setCalendarMonth(new Date().toISOString().slice(0, 7))}
        onSelect={setSelectedDay}
      />

      {selectedDay && <DayTradeModal day={selectedDay} accounts={accList} accent={accent} money={money} onClose={() => setSelectedDay(null)} />}

      {(visible("tradeTime") || visible("tradeDuration")) && <div className="grid gap-3 xl:grid-cols-2">
        {visible("tradeTime") && <PerformanceScatter
          title="Performance par heure"
          detail={`${tradeTimeData.length} trades horodatés`}
          data={tradeTimeData}
          xKey="hour"
          xDomain={[0, 23]}
          xFormatter={(value) => `${String(Math.round(value)).padStart(2, "0")}h`}
          empty="Ajoute une heure d’entrée à tes trades pour activer cette analyse."
          accent={accent}
          money={money}
        />}
        {visible("tradeDuration") && <PerformanceScatter
          title="Performance par durée"
          detail={`${tradeDurationData.length} trades mesurés`}
          data={tradeDurationData}
          xKey="minutes"
          xDomain={[0, "auto"]}
          xFormatter={formatDuration}
          empty="Renseigne la durée des trades pour afficher cette analyse."
          accent={accent}
          money={money}
        />}
      </div>}

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
              return <div key={t.id} className="rounded-xl border border-[#6571CF]/15 bg-[#0A0F1E] p-4 transition active:border-[#7C67D9]/40">
                <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3 min-w-0"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#15182A] text-xs font-bold text-[#B58BFF]">{String(t.instrument || "?").slice(0,2)}</span><div className="min-w-0"><div className="font-semibold truncate">{t.instrument}</div><div className="text-[11px] text-[#6B7280] mt-0.5">{t.date} · {accountName}</div></div></div><div className="text-right"><div className="font-numeric font-semibold" style={{color:!hasPnl?"#9CA3AF":positive?"#46C99A":"#F26A70"}}>{hasPnl?money(t.pnl,{minimumFractionDigits:2,maximumFractionDigits:2,signDisplay:"always"}):"—"}</div><div className="text-[10px] text-[#6B7280] mt-0.5">{typeof t.r==="number"?`${t.r.toFixed(2)}R`:"—"}</div></div></div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.05]"><span className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${directionLong ? "bg-[#46C99A]/10 text-[#46C99A]" : "bg-[#F26A70]/10 text-[#F26A70]"}`}>{directionLong ? "Achat · Long" : "Vente · Short"}</span><span className="text-[11px] text-[#7E8798]">{t.duration || t.session || "—"}</span></div>
              </div>;
            })}
            {!filtered.length && <div className="rounded-2xl border border-dashed border-white/10 py-10 text-center"><BarChart3 className="w-5 h-5 text-[#6B7280] mx-auto"/><p className="text-sm text-[#9CA3AF] mt-2">Aucun trade pour ces filtres.</p></div>}
          </div>

          <div className="m-5 mt-4 hidden overflow-x-auto rounded-lg border border-[#6571CF]/15 bg-[#090D19] md:block">
            <table className="pe-table min-w-[820px]">
              <thead><tr><th className="text-left">Date</th><th className="text-left">Actif</th><th className="text-left">Direction</th><th className="text-right">Résultat</th><th className="text-right">R Multiple</th><th className="text-left">Durée</th><th className="text-left">Compte</th><th className="text-left">Tags</th></tr></thead>
              <tbody>
                {filtered.map(t => {
                  const hasPnl = typeof t.pnl === "number"; const positive = hasPnl && t.pnl >= 0;
                  const directionLong = String(t.direction).toLowerCase() === "long";
                  return <tr key={t.id} className="group border-t border-white/[0.055] transition-colors hover:bg-white/[0.025]">
                    <td className="px-4 py-3.5 text-xs text-[#8B93A3] whitespace-nowrap">{t.date}</td>
                    <td className="px-3 font-semibold"><span className="inline-flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-lg bg-[#15182A] text-[9px] text-[#B58BFF] group-hover:bg-[#7C4DFF]/15">{String(t.instrument || "?").slice(0,2)}</span>{t.instrument}</span></td>
                    <td className="px-3"><span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-medium ${directionLong ? "bg-[#46C99A]/10 text-[#46C99A]" : "bg-[#F26A70]/10 text-[#F26A70]"}`}>{directionLong ? "Achat · Long" : "Vente · Short"}</span></td>
                    <td className="px-3 text-right font-numeric font-semibold" style={{ color: !hasPnl ? "#9CA3AF" : positive ? "#46C99A" : "#F26A70" }}>{hasPnl?money(t.pnl,{minimumFractionDigits:2,maximumFractionDigits:2,signDisplay:"always"}):"—"}</td>
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
          <div className={`${panel} overflow-hidden`} data-testid="kpi-discipline">
            <div className="flex items-start justify-between gap-3 px-5 pt-5">
              <div><div className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="h-4 w-4" style={{ color: accent }} />Répartition discipline</div><div className="mt-1 text-[10px] text-[#6F7890]">Respect du plan sur les trades renseignés</div></div>
              <Link to="/app/discipline" className="text-[10px] text-[#9B8DE1] transition hover:text-white" data-testid="dash-discipline-link">Détails →</Link>
            </div>
            <div className="grid grid-cols-[116px_1fr] items-center gap-3 px-4 pb-4 pt-3">
              <MiniGauge value={k.discipline_score} display={`${k.discipline_score}`} accent={accent} suffix="/100" id="discipline" />
              <div className="space-y-3">
                <DisciplineRow label="Plan respecté" value={planRateLabel} progress={Number(m.plan_respect_rate || 0)} accent={accent} />
                <DisciplineRow label="Trades suivis" value={k.total_trades || recent.length} progress={Math.min(100, (k.total_trades || recent.length) * 10)} accent={accent} />
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-[#6571CF]/15 bg-[#090E1C] px-5 py-3 text-[10px] text-[#747D92]"><span>État actuel</span><span style={{ color: accent }}>{k.discipline_score >= 80 ? "Solide" : k.discipline_score >= 60 ? "À consolider" : k.discipline_score ? "À améliorer" : "En attente"}</span></div>
          </div>
          <div className={`${panel} p-5`} style={{ backgroundImage: `linear-gradient(135deg, ${accentSoft}, transparent 55%)` }}>
            <div className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="h-4 w-4" style={{ color: accent }}/>Atlas · aperçu</div>
            <p className="text-xs text-[#B5BBC9] mt-3 leading-relaxed">{insight}</p>
            <Link to="/app/coach" className="mt-4 block rounded-lg border border-white/[0.09] py-2 text-center text-xs text-[#AAA1D8] transition hover:border-white/[0.16] hover:text-white" data-testid="dash-insight-link">Ouvrir l’analyse →</Link>
          </div>
          {visible("accounts") && <div className={`${panel} overflow-hidden p-5`}>
            <div className="flex items-center justify-between mb-3">
              <div><div className="flex items-center gap-2 text-sm font-semibold"><WalletCards className="h-4 w-4" style={{ color: accent }} />Comptes</div><div className="text-[10px] text-[#6B7280] mt-1">Santé et performance</div></div>
              <Link to="/app/accounts" className="text-xs text-[#B58BFF]">Voir tout</Link>
            </div>
            <div className="space-y-2">
            {accList.slice(0, 4).map(a => {
              const pnl = Number(a.balance || 0) - Number(a.initial_balance || 0);
              const health = Math.max(0, Math.min(100, Number(a.health_score ?? (pnl >= 0 ? 82 : 48))));
              return (
                <div key={a.id} className="rounded-lg border border-[#6571CF]/15 bg-[#090E1C] p-3 transition hover:border-[#7881E8]/30">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#15182A] text-[10px] font-bold text-[#B58BFF]">{String(a.firm || a.name || "C").slice(0,2).toUpperCase()}</span><div className="min-w-0"><div className="text-xs font-medium truncate">{a.name || a.firm}</div><div className="text-[9px] text-[#6B7280] truncate mt-0.5">{a.firm || "Compte de trading"}</div></div></div>
                    <div className="text-right shrink-0"><div className="text-xs font-numeric font-semibold" style={{ color: pnl >= 0 ? "#46C99A" : "#F26A70" }}>{money(pnl,{signDisplay:"always"})}</div><div className="text-[9px] text-[#6B7280] mt-0.5">P&amp;L</div></div>
                  </div>
                  <div className="mt-3 flex items-center gap-2"><div className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.06]"><div className="h-full rounded-full" style={{width:`${health}%`, background: accent}}/></div><span className="w-7 text-right text-[9px] font-mono text-[#8B93A3]">{health}%</span></div>
                </div>
              );
            })}
            {!accList.length && <div className="rounded-xl border border-dashed border-white/10 py-8 text-center text-xs text-[#7E8798]">Aucun compte ajouté.</div>}
            </div>
            <Link to="/app/accounts" className="block text-center mt-4 text-xs text-[#B58BFF]">Gérer mes comptes →</Link>
          </div>}
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, detail, tone = "neutral", testid, accent }) {
  const colors = { positive: "text-[#46C99A]", negative: "text-[#F26A70]", accent: "text-[#A492F0]", neutral: "text-[#F2F2F3]" };
  return <div className="relative min-h-[124px] overflow-hidden rounded-xl border border-[#6571CF]/20 bg-[#0D1120] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.025)]" data-testid={testid}>
    <span className="absolute -right-7 -top-10 h-24 w-24 rounded-full blur-2xl" style={{ background: accent, opacity: .12 }} />
    <div className="relative text-[11px] text-[#8B93A7]">{label}</div>
    <div className={`relative mt-3 font-numeric text-xl font-semibold tracking-[-.02em] sm:text-2xl ${colors[tone]}`}>{value}</div>
    <div className="relative mt-3 text-[10px] text-[#687288]">{detail}</div>
  </div>;
}

function StreakKpi({ dayStreak, tradeStreak, accent }) {
  return <div className="min-h-[124px] rounded-xl border border-[#6571CF]/20 bg-[#0D1120] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.025)]" data-testid="kpi-current-streak">
    <div className="flex items-center gap-1.5 text-[11px] text-[#8B93A7]"><Flame className="h-3.5 w-3.5" style={{ color: accent }} />Série actuelle</div>
    <div className="mt-3 grid grid-cols-2 gap-2">
      <StreakValue label="Jours" streak={dayStreak} accent={accent} />
      <StreakValue label="Trades" streak={tradeStreak} accent={accent} />
    </div>
  </div>;
}

function StreakValue({ label, streak, accent }) {
  const state = streak.count ? (streak.positive ? "gagnants" : "perdants") : "en attente";
  return <div className="rounded-lg border border-[#6571CF]/15 bg-[#090E1C] px-2 py-2 text-center">
    <div className="text-[8px] uppercase tracking-[.14em] text-[#667188]">{label}</div>
    <div className="mx-auto mt-1.5 grid h-8 w-8 place-items-center rounded-full border-2 font-mono text-sm font-semibold text-white" style={{ borderColor: streak.count ? accent : "#263048", boxShadow: streak.count ? `0 0 16px ${accent}33` : "none" }}>{streak.count}</div>
    <div className={`mt-1 text-[8px] ${streak.count && !streak.positive ? "text-[#F26A70]" : "text-[#78839A]"}`}>{state}</div>
  </div>;
}

function TradeCalendarPanel({ cells, label, accent, money, onPrevious, onNext, onToday, onSelect }) {
  const monthCells = cells.filter((cell) => cell.inMonth);
  const monthPnl = monthCells.reduce((sum, cell) => sum + cell.pnl, 0);
  const activeDays = monthCells.filter((cell) => cell.trades.length).length;
  return <section className="overflow-hidden rounded-xl border border-[#6571CF]/20 bg-[#0D1120] shadow-[inset_0_1px_0_rgba(255,255,255,.025)]" data-testid="dashboard-trade-calendar">
    <div className="flex flex-col gap-3 border-b border-[#6571CF]/15 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div className="flex items-center gap-2">
        <button type="button" onClick={onPrevious} className="grid h-8 w-8 place-items-center rounded-lg border border-[#6571CF]/15 text-[#8690A5] transition hover:border-[#7881E8]/35 hover:text-white" aria-label="Mois précédent"><ChevronLeft className="h-4 w-4" /></button>
        <div className="min-w-[150px] text-center"><h2 className="text-sm font-semibold capitalize text-[#E7E9F1]">{label}</h2><p className="mt-0.5 text-[9px] text-[#687288]">Calendrier des trades</p></div>
        <button type="button" onClick={onNext} className="grid h-8 w-8 place-items-center rounded-lg border border-[#6571CF]/15 text-[#8690A5] transition hover:border-[#7881E8]/35 hover:text-white" aria-label="Mois suivant"><ChevronRight className="h-4 w-4" /></button>
        <button type="button" onClick={onToday} className="ml-1 rounded-lg border border-[#6571CF]/15 px-3 py-2 text-[10px] text-[#98A1B5] transition hover:border-[#7881E8]/35 hover:text-white">Ce mois</button>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-[10px]"><Link to="/app/day-view" className="rounded-lg border border-[#8067F4]/30 bg-[#8067F4]/10 px-2.5 py-1.5 font-semibold text-[#B7A8FF] transition hover:border-[#8067F4]/55 hover:text-white">Vue journalière</Link><span className="rounded-lg border border-[#6571CF]/15 bg-[#090E1C] px-2.5 py-1.5 text-[#8B95A9]">{activeDays} jour{activeDays > 1 ? "s" : ""} tradé{activeDays > 1 ? "s" : ""}</span><span className={`rounded-lg border px-2.5 py-1.5 font-mono ${monthPnl > 0 ? "border-[#46C99A]/20 bg-[#46C99A]/[0.07] text-[#46C99A]" : monthPnl < 0 ? "border-[#F26A70]/20 bg-[#F26A70]/[0.07] text-[#F26A70]" : "border-[#6571CF]/15 bg-[#090E1C] text-[#8B95A9]"}`}>{money(monthPnl, { signDisplay: "always" })}</span></div>
    </div>
    <div className="p-2 sm:p-4">
      <div className="grid grid-cols-7 gap-1 text-center text-[8px] font-medium uppercase tracking-[.12em] text-[#5F6A80] sm:gap-2 sm:text-[9px]">{["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((day) => <div key={day} className="py-1.5">{day}</div>)}</div>
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {cells.map((cell) => {
          const hasTrades = cell.trades.length > 0;
          const positive = cell.pnl > 0;
          const negative = cell.pnl < 0;
          return <button
            type="button"
            key={cell.key}
            onClick={() => onSelect(cell)}
            disabled={!cell.inMonth}
            className={`relative min-h-[58px] rounded-lg border p-1.5 text-left transition sm:min-h-[92px] sm:p-2.5 ${!cell.inMonth ? "cursor-default border-transparent bg-transparent opacity-25" : hasTrades ? positive ? "border-[#46C99A]/30 bg-[#46C99A]/[0.08] hover:border-[#46C99A]/55" : negative ? "border-[#F26A70]/30 bg-[#F26A70]/[0.08] hover:border-[#F26A70]/55" : "border-[#6571CF]/18 bg-[#6571CF]/[0.06] hover:border-[#727DDE]/35" : "border-[#6571CF]/12 bg-[#090E1C] hover:border-[#727DDE]/28"}`}
            aria-label={`${cell.key}, ${cell.trades.length} trades, ${money(cell.pnl)}`}
          >
            <div className="text-right font-mono text-[9px] text-[#7F899E] sm:text-[10px]">{cell.day}</div>
            {hasTrades && <div className="mt-1 text-center sm:mt-3"><div className={`truncate font-mono text-[8px] font-semibold sm:text-xs ${positive ? "text-[#46C99A]" : negative ? "text-[#F26A70]" : "text-[#9C8EF0]"}`}>{money(cell.pnl, { signDisplay: "always", maximumFractionDigits: 0 })}</div><div className="mt-1 hidden text-[8px] text-[#69758B] sm:block">{cell.trades.length} trade{cell.trades.length > 1 ? "s" : ""}</div><span className="mx-auto mt-1 block h-1 w-1 rounded-full sm:hidden" style={{ background: positive ? "#46C99A" : negative ? "#F26A70" : accent }} /></div>}
          </button>;
        })}
      </div>
    </div>
  </section>;
}

function DayTradeModal({ day, accounts, accent, money, onClose }) {
  const orderedTrades = [...day.trades].sort((a, b) => tradeTimestamp(a) - tradeTimestamp(b));
  let cumulative = 0;
  const curve = [{ index: 0, label: "Début", pnl: 0 }, ...orderedTrades.map((trade, index) => ({
    index: index + 1,
    label: tradeTimeLabel(trade),
    pnl: Math.round((cumulative += Number(trade.pnl || 0)) * 100) / 100,
  }))];
  const wins = orderedTrades.filter((trade) => Number(trade.pnl) > 0);
  const losses = orderedTrades.filter((trade) => Number(trade.pnl) < 0);
  const grossProfit = wins.reduce((sum, trade) => sum + Number(trade.pnl || 0), 0);
  const grossLoss = Math.abs(losses.reduce((sum, trade) => sum + Number(trade.pnl || 0), 0));
  const profitFactor = grossLoss ? grossProfit / grossLoss : grossProfit > 0 ? grossProfit : 0;
  const commissions = orderedTrades.reduce((sum, trade) => sum + Number(trade.commission ?? trade.commissions ?? trade.fees ?? 0), 0);
  const volume = orderedTrades.reduce((sum, trade) => sum + Number(trade.volume ?? trade.quantity ?? trade.size ?? 0), 0);
  const dateLabel = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }).format(new Date(`${day.key}T12:00:00`));
  const summary = [
    ["Total trades", orderedTrades.length],
    ["P&L net", money(day.pnl, { signDisplay: "always" })],
    ["Gagnants / Perdants", `${wins.length} / ${losses.length}`],
    ["Win rate", `${orderedTrades.length ? (wins.length / orderedTrades.length * 100).toFixed(1) : "0.0"}%`],
    ["Volume", volume ? volume.toLocaleString("fr-FR", { maximumFractionDigits: 2 }) : "—"],
    ["Profit factor", profitFactor ? profitFactor.toFixed(2) : "—"],
    ["Commissions", commissions ? money(commissions) : "—"],
  ];

  return <div className="fixed inset-0 z-[80] flex items-end justify-center bg-[#03050C]/80 backdrop-blur-sm sm:items-center sm:p-4" role="presentation" onMouseDown={onClose}>
    <section role="dialog" aria-modal="true" aria-labelledby="day-trades-title" onMouseDown={(event) => event.stopPropagation()} className="flex max-h-[96dvh] w-full max-w-6xl flex-col overflow-hidden rounded-t-2xl border border-[#6571CF]/25 bg-[#090E1C] shadow-2xl sm:max-h-[90vh] sm:rounded-2xl">
      <header className="flex shrink-0 items-start justify-between gap-4 border-b border-[#6571CF]/15 px-4 py-4 sm:px-6">
        <div className="min-w-0"><div className="pe-eyebrow">Détail de la séance</div><h2 id="day-trades-title" className="mt-1 truncate text-lg font-semibold capitalize text-[#F3F5FA] sm:text-xl">{dateLabel}</h2><div className={`mt-1 font-numeric text-sm font-semibold ${day.pnl < 0 ? "text-[#F26A70]" : "text-[#85A9FF]"}`}>P&amp;L net · {money(day.pnl, { signDisplay: "always" })}</div></div>
        <button type="button" onClick={onClose} aria-label="Fermer le détail de la journée" className="pe-icon-button !h-9 !w-9"><X className="h-4 w-4" /></button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
        <div className="grid gap-4 border-b border-[#6571CF]/15 p-4 sm:p-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <div className="h-52 rounded-xl border border-[#6571CF]/15 bg-[#0D1120] p-3">
            {orderedTrades.length ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={curve} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}><defs><linearGradient id="day-modal-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={day.pnl < 0 ? "#F26A70" : accent} stopOpacity="0.35"/><stop offset="100%" stopColor={day.pnl < 0 ? "#F26A70" : accent} stopOpacity="0"/></linearGradient></defs><CartesianGrid vertical={false} stroke="rgba(101,113,207,.14)" strokeDasharray="3 4"/><XAxis dataKey="index" tick={{ fill: "#687288", fontSize: 9 }} tickLine={false} axisLine={false}/><YAxis width={52} tick={{ fill: "#687288", fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={(value) => money(value, { maximumFractionDigits: 0 })}/><ReferenceLine y={0} stroke="rgba(255,255,255,.18)"/><Tooltip contentStyle={{ background: "#0B1020", border: "1px solid rgba(112,119,218,.3)", borderRadius: 8, fontSize: 11 }} formatter={(value) => [money(value, { signDisplay: "always" }), "P&L cumulé"]}/><Area type="monotone" dataKey="pnl" stroke={day.pnl < 0 ? "#F26A70" : accent} strokeWidth={2} fill="url(#day-modal-fill)"/></AreaChart></ResponsiveContainer> : <div className="grid h-full place-items-center text-center text-xs text-[#687288]">Aucun trade enregistré ce jour.</div>}
          </div>
          <div className="grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-3 lg:grid-cols-4">{summary.map(([label, value]) => <div key={label} className="min-w-0 border-b border-[#6571CF]/10 pb-3"><div className="text-[10px] text-[#747E93]">{label}</div><div className="font-numeric mt-1 truncate text-sm font-semibold text-[#E6E9F1] sm:text-base">{value}</div></div>)}</div>
        </div>

        <div className="p-4 sm:p-6">
          <div className="mb-3 flex items-center justify-between gap-3"><div><h3 className="text-sm font-semibold">Trades de la journée</h3><p className="mt-1 text-[10px] text-[#687288]">{orderedTrades.length} opération{orderedTrades.length > 1 ? "s" : ""} dans le journal</p></div></div>
          {orderedTrades.length ? <div className="overflow-x-auto rounded-xl border border-[#6571CF]/15"><table className="w-full min-w-[760px] text-left text-xs"><thead className="bg-[#11162A] text-[10px] uppercase tracking-[.08em] text-[#747E93]"><tr><th className="px-4 py-3">Heure</th><th className="px-4 py-3">Actif</th><th className="px-4 py-3">Sens</th><th className="px-4 py-3">Compte</th><th className="px-4 py-3">P&amp;L net</th><th className="px-4 py-3">R réalisé</th><th className="px-4 py-3">Setup</th></tr></thead><tbody>{orderedTrades.map((trade, index) => { const pnl = Number(trade.pnl || 0); const account = accounts.find((item) => item.id === trade.account_id); return <tr key={trade.id || `${day.key}-${index}`} className="border-t border-[#6571CF]/10 text-[#C7CCDA]"><td className="px-4 py-3 font-mono text-[#8D96AA]">{tradeTimeLabel(trade)}</td><td className="px-4 py-3 font-semibold text-white">{trade.instrument || trade.asset || "—"}</td><td className="px-4 py-3"><span className={`rounded-md px-2 py-1 text-[10px] ${String(trade.direction).toLowerCase() === "long" ? "bg-[#4F8DFF]/10 text-[#85A9FF]" : "bg-[#8067F4]/10 text-[#B7A8FF]"}`}>{tradeDirectionLabel(trade.direction)}</span></td><td className="px-4 py-3 text-[#8D96AA]">{account?.name || account?.firm || "—"}</td><td className={`px-4 py-3 font-numeric font-semibold ${pnl < 0 ? "text-[#F26A70]" : pnl > 0 ? "text-[#46C99A]" : "text-[#98A1B5]"}`}>{money(pnl, { signDisplay: "always" })}</td><td className="px-4 py-3 font-mono">{Number.isFinite(Number(trade.r)) ? `${Number(trade.r).toFixed(2)}R` : "—"}</td><td className="px-4 py-3 text-[#8D96AA]">{trade.setup || trade.setups?.[0] || trade.tags?.[0] || "—"}</td></tr>; })}</tbody></table></div> : <div className="rounded-xl border border-dashed border-[#6571CF]/20 py-12 text-center text-xs text-[#687288]">Aucun trade enregistré pour cette date.</div>}
        </div>
      </div>

      <footer className="flex shrink-0 flex-col-reverse gap-2 border-t border-[#6571CF]/15 bg-[#070B16]/95 p-4 sm:flex-row sm:justify-end sm:px-6">
        <button type="button" onClick={onClose} className="btn-ghost">Fermer</button>
        <Link to={`/app/day-view?date=${day.key}`} className="btn-ghost inline-flex items-center justify-center gap-2"><Calendar className="h-4 w-4"/>Vue journalière</Link>
        <Link to={`/app/journal?date=${day.key}`} className="btn-primary inline-flex items-center justify-center gap-2"><BookOpen className="h-4 w-4"/>Voir dans le journal</Link>
      </footer>
    </section>
  </div>;
}

function PerformanceScatter({ title, detail, data, xKey, xDomain, xFormatter, empty, accent, money }) {
  return <section className="overflow-hidden rounded-xl border border-[#6571CF]/20 bg-[#0D1120] shadow-[inset_0_1px_0_rgba(255,255,255,.025)]">
    <PanelHeader title={title} detail={detail} />
    {data.length ? <div className="h-[270px] px-2 pb-3 pt-4 sm:px-5">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 8, right: 14, bottom: 6, left: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,.065)" strokeDasharray="3 4" />
          <XAxis type="number" dataKey={xKey} domain={xDomain} tick={{ fill: "#707B90", fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={xFormatter} />
          <YAxis type="number" dataKey="pnl" width={54} tick={{ fill: "#707B90", fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={(value) => money(value, { maximumFractionDigits: 0 })} />
          <ReferenceLine y={0} stroke="rgba(255,255,255,.2)" />
          <Tooltip cursor={{ stroke: "rgba(128,103,244,.25)", strokeDasharray: "3 3" }} contentStyle={{ background: "#0B1020", border: "1px solid rgba(112,119,218,.3)", borderRadius: 8, fontSize: 12 }} formatter={(value, name) => [name === "pnl" ? money(value, { signDisplay: "always" }) : xFormatter(value), name === "pnl" ? "P&L" : title]} />
          <Scatter data={data} fill={accent}>{data.map((point, index) => <Cell key={`${point.instrument || "trade"}-${index}`} fill={point.pnl < 0 ? "#F26A70" : accent} />)}</Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div> : <div className="grid h-[270px] place-items-center px-8 text-center"><div><BarChart3 className="mx-auto h-6 w-6 text-[#556079]"/><p className="mt-3 max-w-xs text-xs leading-5 text-[#747E93]">{empty}</p></div></div>}
  </section>;
}

function GaugeKpi({ label, value, display, detail, accent, id, testid, amount = false }) {
  const safeValue = clamp(value);
  const gradientId = `dashboard-gauge-${id}`;
  return <div className="min-h-[124px] rounded-xl border border-[#6571CF]/20 bg-[#0D1120] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.025)]" data-testid={testid}>
    <div className="text-[11px] text-[#8B93A7]">{label}</div>
    <div className="mt-2 grid grid-cols-[minmax(0,1fr)_88px] items-end gap-2">
      <div className="min-w-0 pb-1">
        <div className={`font-numeric font-semibold tracking-[-.025em] text-[#F3F5FA] ${amount ? "text-base sm:text-lg" : "text-xl sm:text-2xl"}`}>{display}</div>
        <div className="mt-2 text-[9px] leading-4 text-[#687288]">{detail}</div>
      </div>
      <svg viewBox="0 0 120 66" className="h-[54px] w-[88px]" role="img" aria-label={`${label} : ${display}`}>
        <defs><linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#536BFF"/><stop offset="100%" stopColor={accent}/></linearGradient></defs>
        <path d="M10 56 A50 50 0 0 1 110 56" pathLength="100" fill="none" stroke="#1D263A" strokeWidth="10" strokeLinecap="round" />
        <path d="M10 56 A50 50 0 0 1 110 56" pathLength="100" fill="none" stroke={`url(#${gradientId})`} strokeWidth="10" strokeLinecap="round" strokeDasharray="100" strokeDashoffset={100 - safeValue} />
        <circle cx="10" cy="56" r="2" fill="#536BFF" />
        <circle cx="110" cy="56" r="2" fill={accent} opacity={safeValue > 98 ? 1 : .18} />
      </svg>
    </div>
  </div>;
}

function RingKpi({ label, value, display, detail, accent, id }) {
  const safeValue = clamp(value);
  const gradientId = `dashboard-ring-${id}`;
  return <div className="min-h-[124px] rounded-xl border border-[#6571CF]/20 bg-[#0D1120] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.025)]">
    <div className="text-[11px] text-[#8B93A7]">{label}</div>
    <div className="mt-2 grid grid-cols-[minmax(0,1fr)_60px] items-center gap-3">
      <div className="min-w-0"><div className="font-numeric text-xl font-semibold tracking-[-.025em] text-[#F3F5FA] sm:text-2xl">{display}</div><div className="mt-2 text-[9px] leading-4 text-[#687288]">{detail}</div></div>
      <svg viewBox="0 0 52 52" className="h-[58px] w-[58px] -rotate-90" role="img" aria-label={`${label} : ${display}`}>
        <defs><linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#4F8DFF"/><stop offset="100%" stopColor={accent}/></linearGradient></defs>
        <circle cx="26" cy="26" r="20" pathLength="100" fill="none" stroke="#1D263A" strokeWidth="7" />
        <circle cx="26" cy="26" r="20" pathLength="100" fill="none" stroke={`url(#${gradientId})`} strokeWidth="7" strokeLinecap="round" strokeDasharray="100" strokeDashoffset={100 - safeValue} />
      </svg>
    </div>
  </div>;
}

function MiniGauge({ value, display, suffix, accent, id }) {
  const safeValue = clamp(value);
  const gradientId = `dashboard-mini-${id}`;
  return <div className="text-center">
    <svg viewBox="0 0 120 72" className="mx-auto h-[70px] w-[112px]" role="img" aria-label={`Score de discipline : ${display}${suffix}`}>
      <defs><linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#4F8DFF"/><stop offset="100%" stopColor={accent}/></linearGradient></defs>
      <path d="M10 60 A50 50 0 0 1 110 60" pathLength="100" fill="none" stroke="#1D263A" strokeWidth="9" strokeLinecap="round" />
      <path d="M10 60 A50 50 0 0 1 110 60" pathLength="100" fill="none" stroke={`url(#${gradientId})`} strokeWidth="9" strokeLinecap="round" strokeDasharray="100" strokeDashoffset={100 - safeValue} />
      <text x="60" y="58" textAnchor="middle" fill="#F3F5FA" fontSize="24" fontWeight="700">{display}</text>
      <text x="83" y="58" fill="#7F899E" fontSize="8">{suffix}</text>
    </svg>
  </div>;
}

function DisciplineRow({ label, value, progress, accent }) {
  return <div>
    <div className="flex items-center justify-between gap-2 text-[10px]"><span className="text-[#747D91]">{label}</span><span className="font-mono text-[#CBD0DC]">{value}</span></div>
    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[#1C2538]"><div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${clamp(progress)}%`, background: accent }} /></div>
  </div>;
}

function PanelHeader({ title, detail }) {
  return <div className="flex items-center justify-between border-b border-[#6571CF]/15 px-4 py-3.5 sm:px-5">
    <h2 className="text-sm font-semibold text-[#E7E7E8]">{title}</h2>
    <span className="text-[10px] text-[#6F7580]">{detail}</span>
  </div>;
}

function calculateStreak(values) {
  const measurable = values.filter((value) => Number(value) !== 0 && Number.isFinite(Number(value)));
  if (!measurable.length) return { count: 0, positive: true };
  const positive = Number(measurable[0]) > 0;
  let count = 0;
  for (const value of measurable) {
    if ((Number(value) > 0) !== positive) break;
    count += 1;
  }
  return { count, positive };
}

function tradeTimestamp(trade) {
  const raw = trade.entry_time || trade.open_time || trade.opened_at;
  if (typeof raw === "string" && /^\d{1,2}:\d{2}/.test(raw)) {
    const [hours, minutes, seconds = 0] = raw.split(":").map(Number);
    return hours * 3600 + minutes * 60 + seconds;
  }
  const timestamp = raw ? new Date(raw).getTime() : Number.NaN;
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function tradeTimeLabel(trade) {
  const raw = trade.entry_time || trade.open_time || trade.opened_at;
  if (typeof raw === "string") {
    const plainTime = raw.match(/^(\d{1,2}:\d{2})(?::(\d{2}))?/);
    if (plainTime) return plainTime[2] ? `${plainTime[1]}:${plainTime[2]}` : plainTime[1];
    const date = new Date(raw);
    if (!Number.isNaN(date.getTime())) return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(date);
  }
  return "—";
}

function tradeDirectionLabel(direction) {
  const value = String(direction || "").toLowerCase();
  if (value === "long" || value === "buy" || value === "achat") return "Long";
  if (value === "short" || value === "sell" || value === "vente") return "Short";
  return direction || "—";
}

function tradeHour(trade) {
  const raw = trade.entry_time || trade.open_time || trade.opened_at;
  if (typeof raw === "string") {
    const plainTime = raw.match(/^(\d{1,2}):\d{2}/);
    if (plainTime) return Math.min(23, Number(plainTime[1]));
    const date = new Date(raw);
    if (!Number.isNaN(date.getTime())) return date.getHours();
  }
  const session = String(trade.session || "").toLowerCase();
  if (session.includes("asia")) return 3;
  if (session.includes("london") || session.includes("londres")) return 9;
  if (session.includes("new york") || session === "ny") return 15;
  return null;
}

function tradeDurationMinutes(trade) {
  const direct = Number(trade.duration_minutes);
  if (Number.isFinite(direct) && direct >= 0) return direct;
  const label = String(trade.duration || "").toLowerCase();
  const hours = label.match(/([\d.,]+)\s*h/);
  const minutes = label.match(/([\d.,]+)\s*(?:m|min)/);
  if (hours || minutes) return Math.round((hours ? Number(hours[1].replace(",", ".")) * 60 : 0) + (minutes ? Number(minutes[1].replace(",", ".")) : 0));
  if (trade.entry_time && trade.exit_time) {
    const opened = new Date(trade.entry_time);
    const closed = new Date(trade.exit_time);
    const difference = (closed.getTime() - opened.getTime()) / 60000;
    if (Number.isFinite(difference) && difference >= 0) return Math.round(difference);
  }
  return null;
}

function shiftMonth(monthKey, amount) {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 1 + amount, 1, 12);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatDuration(value) {
  const minutes = Math.max(0, Math.round(Number(value || 0)));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h${String(rest).padStart(2, "0")}` : `${hours}h`;
}

function clamp(value) {
  return Math.max(0, Math.min(100, Number(value || 0)));
}
