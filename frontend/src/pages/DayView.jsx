import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BookOpen, Brain, CalendarRange, ChevronDown, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { accounts as accountsAPI, trades as tradesAPI } from "@/lib/api";
import { buildMonthCells, groupTradesByDate } from "@/lib/tradeCalendar";
import useAppSettings from "@/hooks/useAppSettings";

const today = new Date().toISOString().slice(0, 10);

export default function DayView() {
  const { money } = useAppSettings();
  const [params, setParams] = useSearchParams();
  const requestedDate = params.get("date");
  const [month, setMonth] = useState(() => requestedDate?.slice(0, 7) || today.slice(0, 7));
  const [selectedDate, setSelectedDate] = useState(requestedDate || "");
  const [tradeList, setTradeList] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true); setError("");
    try {
      const [tradeResponse, accountResponse] = await Promise.all([tradesAPI.list(), accountsAPI.list()]);
      setTradeList(tradeResponse.data || []);
      setAccounts(accountResponse.data || []);
    } catch (requestError) {
      setError(requestError.response?.data?.detail || "Impossible de charger les séances.");
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const grouped = useMemo(() => groupTradesByDate(tradeList), [tradeList]);
  const cells = useMemo(() => buildMonthCells(month, grouped), [month, grouped]);
  const availableDays = useMemo(() => Object.entries(grouped)
    .filter(([key]) => key.startsWith(month))
    .sort(([a], [b]) => b.localeCompare(a)), [grouped, month]);
  const visibleDays = selectedDate && selectedDate.startsWith(month)
    ? availableDays.filter(([key]) => key === selectedDate)
    : availableDays;

  const chooseDate = (key) => {
    setSelectedDate(key);
    setParams({ date: key }, { replace: true });
  };
  const showAll = () => {
    setSelectedDate("");
    setParams({}, { replace: true });
  };
  const shiftMonth = (amount) => {
    const [year, monthNumber] = month.split("-").map(Number);
    const next = new Date(year, monthNumber - 1 + amount, 1, 12);
    setMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`);
    setSelectedDate("");
    setParams({}, { replace: true });
  };
  const monthLabel = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(new Date(`${month}-01T12:00:00`));

  return <div className="pe-page pe-page-stack mx-auto max-w-[1800px]">
    <div className="pe-page-header">
      <div><div className="pe-eyebrow">Revue quotidienne</div><h1 className="pe-page-title mt-2 flex items-center gap-2"><CalendarRange className="h-6 w-6 text-[#9C8EF0]"/>Vue journalière</h1><p className="pe-page-copy mt-1">Relis chaque séance, ses statistiques et l’ordre réel de tes trades.</p></div>
      <Link to="/app/journal" className="btn-ghost inline-flex items-center justify-center gap-2"><BookOpen className="h-4 w-4"/>Ouvrir le journal</Link>
    </div>

    {error && <div className="flex items-center justify-between gap-3 rounded-pe-xl border border-[#F26A70]/25 bg-[#F26A70]/10 p-4 text-sm text-[#FF8A8A]"><span>{error}</span><button onClick={load} className="inline-flex items-center gap-2"><RefreshCw className="h-4 w-4"/>Réessayer</button></div>}

    <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_310px]">
      <main className="min-w-0 space-y-3">
        <div className="pe-card flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2"><button onClick={() => shiftMonth(-1)} className="pe-icon-button !h-9 !w-9" aria-label="Mois précédent"><ChevronLeft className="h-4 w-4"/></button><div className="min-w-[150px] text-center text-sm font-semibold capitalize">{monthLabel}</div><button onClick={() => shiftMonth(1)} className="pe-icon-button !h-9 !w-9" aria-label="Mois suivant"><ChevronRight className="h-4 w-4"/></button></div>
          <button onClick={showAll} className={`min-h-9 rounded-pe-md border px-3 text-xs font-semibold transition ${!selectedDate ? "border-[#8067F4]/45 bg-[#8067F4]/15 text-white" : "border-[#6571CF]/20 text-[#98A1B5] hover:text-white"}`}>Toutes les séances</button>
        </div>

        {loading ? Array.from({ length: 2 }).map((_, index) => <div key={index} className="pe-card h-72 animate-pulse"/>) : visibleDays.length ? visibleDays.map(([key, dayTrades]) => <DaySession key={key} dateKey={key} trades={dayTrades} accounts={accounts} money={money}/>) : <div className="pe-card pe-empty-state"><div><CalendarRange className="mx-auto h-9 w-9 text-[#8067F4]"/><h2 className="mt-4 text-lg font-semibold">Aucune séance sur cette période</h2><p className="pe-page-copy mt-2">Les journées apparaîtront ici dès que des trades seront synchronisés ou ajoutés au journal.</p></div></div>}
      </main>

      <aside className="pe-card h-fit xl:sticky xl:top-4">
        <div className="pe-card-header"><div><div className="pe-card-title capitalize">{monthLabel}</div><div className="pe-card-meta mt-1">Choisis une journée</div></div><button onClick={() => { setMonth(today.slice(0, 7)); chooseDate(today); }} className="text-xs font-semibold text-[#9C8EF0]">Aujourd’hui</button></div>
        <div className="p-3"><div className="mb-2 grid grid-cols-7 gap-1 text-center text-[9px] font-semibold uppercase text-[#687288]">{["Lu","Ma","Me","Je","Ve","Sa","Di"].map(label => <span key={label}>{label}</span>)}</div><div className="grid grid-cols-7 gap-1">{cells.map(cell => { const active = cell.key === selectedDate; const hasTrades = cell.trades.length > 0; const positive = cell.pnl > 0; const negative = cell.pnl < 0; return <button key={cell.key} disabled={!cell.inMonth} onClick={() => chooseDate(cell.key)} className={`relative aspect-square rounded-md border text-[10px] transition ${!cell.inMonth ? "border-transparent opacity-20" : hasTrades ? positive ? "border-[#46C99A]/35 bg-[#46C99A]/10 text-[#DDF8EE] hover:border-[#46C99A]/60" : negative ? "border-[#F26A70]/35 bg-[#F26A70]/10 text-[#FFE3E5] hover:border-[#F26A70]/60" : "border-[#6571CF]/20 bg-[#6571CF]/[0.07] text-[#DDE5FF] hover:border-[#8067F4]/50" : "border-[#6571CF]/12 bg-[#090E1C] text-[#687288] hover:border-[#6571CF]/30"} ${active && cell.inMonth ? "ring-1 ring-[#8067F4] ring-offset-1 ring-offset-[#0D1120]" : ""}`}><span>{cell.day}</span>{hasTrades && <i className={`absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full ${positive ? "bg-[#46C99A]" : negative ? "bg-[#F26A70]" : "bg-[#8067F4]"}`}/>}</button>; })}</div></div>
      </aside>
    </div>
  </div>;
}

function DaySession({ dateKey, trades, accounts, money }) {
  const [expanded, setExpanded] = useState(true);
  const ordered = [...trades].sort((a, b) => timestamp(a) - timestamp(b));
  const pnl = ordered.reduce((sum, trade) => sum + Number(trade.pnl || 0), 0);
  const wins = ordered.filter(trade => Number(trade.pnl) > 0);
  const losses = ordered.filter(trade => Number(trade.pnl) < 0);
  const grossWin = wins.reduce((sum, trade) => sum + Number(trade.pnl || 0), 0);
  const grossLoss = Math.abs(losses.reduce((sum, trade) => sum + Number(trade.pnl || 0), 0));
  let cumulative = 0;
  const curve = [{ index: 0, pnl: 0 }, ...ordered.map((trade, index) => ({ index: index + 1, pnl: cumulative += Number(trade.pnl || 0) }))];
  const label = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }).format(new Date(`${dateKey}T12:00:00`));
  const stats = [["Total trades", ordered.length], ["P&L net", money(pnl, { signDisplay: "always" })], ["Gagnants / Perdants", `${wins.length} / ${losses.length}`], ["Win rate", `${ordered.length ? (wins.length / ordered.length * 100).toFixed(1) : "0.0"}%`], ["Profit factor", grossLoss ? (grossWin / grossLoss).toFixed(2) : grossWin > 0 ? "∞" : "—"]];

  return <section className="pe-card overflow-hidden">
    <div className="pe-card-header flex-wrap"><button onClick={() => setExpanded(value => !value)} className="flex min-w-0 items-center gap-3 text-left"><ChevronDown className={`h-4 w-4 shrink-0 text-[#9C8EF0] transition ${expanded ? "rotate-0" : "-rotate-90"}`}/><div><h2 className="text-sm font-semibold capitalize sm:text-base">{label}</h2><div className={`mt-1 font-numeric text-xs font-semibold ${pnl >= 0 ? "text-[#46C99A]" : "text-[#F26A70]"}`}>P&amp;L net · {money(pnl, { signDisplay: "always" })}</div></div></button><div className="flex gap-2"><Link to={`/app/coach?date=${dateKey}`} className="pe-icon-button !h-9 !w-9" aria-label="Analyser avec Atlas" title="Analyser avec Atlas"><Brain className="h-4 w-4"/></Link><Link to={`/app/journal?date=${dateKey}`} className="btn-ghost inline-flex !min-h-9 items-center gap-2 !px-3 text-xs"><BookOpen className="h-3.5 w-3.5"/>Journal</Link></div></div>
    {expanded && <div className="p-4 sm:p-5"><div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]"><div className="h-44 rounded-pe-md border border-[#6571CF]/14 bg-[#090E1C] p-2"><ResponsiveContainer width="100%" height="100%"><AreaChart data={curve}><defs><linearGradient id={`session-${dateKey}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={pnl >= 0 ? "#4F8DFF" : "#F26A70"} stopOpacity=".34"/><stop offset="100%" stopColor={pnl >= 0 ? "#4F8DFF" : "#F26A70"} stopOpacity="0"/></linearGradient></defs><CartesianGrid vertical={false} stroke="rgba(101,113,207,.12)" strokeDasharray="3 4"/><XAxis hide dataKey="index"/><YAxis width={50} tick={{ fill: "#687288", fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={value => money(value, { maximumFractionDigits: 0 })}/><ReferenceLine y={0} stroke="rgba(255,255,255,.16)"/><Tooltip contentStyle={{ background: "#0B1020", border: "1px solid rgba(101,113,207,.3)", borderRadius: 8, fontSize: 11 }} formatter={value => [money(value, { signDisplay: "always" }), "P&L"]}/><Area dataKey="pnl" type="monotone" stroke={pnl >= 0 ? "#4F8DFF" : "#F26A70"} strokeWidth={2} fill={`url(#session-${dateKey})`}/></AreaChart></ResponsiveContainer></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{stats.map(([name, value]) => <div key={name} className="rounded-pe-md border border-[#6571CF]/14 bg-[#090E1C] p-3"><div className="text-[10px] text-[#687288]">{name}</div><div className="font-numeric mt-2 text-sm font-semibold">{value}</div></div>)}</div></div>
      <div className="mt-5 overflow-x-auto"><table className="pe-table min-w-[720px]"><thead><tr><th>Heure</th><th>Actif</th><th>Sens</th><th>Compte</th><th>P&amp;L</th><th>R</th><th>Setup</th></tr></thead><tbody>{ordered.map((trade, index) => { const tradePnl = Number(trade.pnl || 0); const account = accounts.find(item => item.id === trade.account_id); return <tr key={trade.id || index}><td className="font-mono">{timeLabel(trade)}</td><td className="font-semibold !text-white">{trade.instrument || trade.asset || "—"}</td><td>{directionLabel(trade.direction)}</td><td>{account?.name || account?.firm || "—"}</td><td className={`font-numeric font-semibold ${tradePnl >= 0 ? "!text-[#46C99A]" : "!text-[#F26A70]"}`}>{money(tradePnl, { signDisplay: "always" })}</td><td>{Number.isFinite(Number(trade.r)) ? `${Number(trade.r).toFixed(2)}R` : "—"}</td><td>{trade.setup || trade.setups?.[0] || trade.tags?.[0] || "—"}</td></tr>; })}</tbody></table></div></div>}
  </section>;
}

function timestamp(trade) {
  const raw = trade.entry_time || trade.open_time || trade.opened_at || trade.date;
  if (typeof raw === "string" && /^\d{1,2}:\d{2}/.test(raw)) return raw.split(":").reduce((value, part) => value * 60 + Number(part), 0);
  const value = new Date(raw).getTime();
  return Number.isFinite(value) ? value : 0;
}
function timeLabel(trade) {
  const raw = trade.entry_time || trade.open_time || trade.opened_at;
  if (!raw) return "—";
  const match = String(raw).match(/^(\d{1,2}:\d{2})(?::(\d{2}))?/);
  if (match) return match[2] ? `${match[1]}:${match[2]}` : match[1];
  const value = new Date(raw);
  return Number.isNaN(value.getTime()) ? "—" : value.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}
function directionLabel(value) {
  const direction = String(value || "").toLowerCase();
  if (["long", "buy", "achat"].includes(direction)) return "Long";
  if (["short", "sell", "vente"].includes(direction)) return "Short";
  return value || "—";
}
