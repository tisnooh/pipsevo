import React, { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Target, TrendingDown, TrendingUp } from "lucide-react";
import { buildMonthCells, groupTradesByDate, tradeDateKey } from "@/lib/tradeCalendar";

const MONTHS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const currentMonthKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

export default function TradeCalendar({ trades, money, formatDate }) {
  const [monthKey, setMonthKey] = useState(currentMonthKey);
  const [selectedDay, setSelectedDay] = useState(null);
  const grouped = useMemo(() => groupTradesByDate(trades), [trades]);
  const cells = useMemo(() => buildMonthCells(monthKey, grouped), [monthKey, grouped]);
  const [year, month] = monthKey.split("-").map(Number);
  const availableYears = useMemo(() => {
    const years = new Set([new Date().getFullYear(), ...trades.map(trade => Number(tradeDateKey(trade.date).slice(0, 4))).filter(Boolean)]);
    const min = Math.min(...years);
    const max = Math.max(...years);
    for (let value = min; value <= max; value += 1) years.add(value);
    return [...years].sort((a, b) => b - a);
  }, [trades]);
  const monthCells = cells.filter(cell => cell.inMonth);
  const monthTrades = monthCells.flatMap(cell => cell.trades);
  const monthPnl = monthTrades.reduce((sum, trade) => sum + Number(trade.pnl || 0), 0);
  const activeDays = monthCells.filter(cell => cell.trades.length);
  const winningDays = activeDays.filter(cell => cell.pnl > 0).length;
  const losingDays = activeDays.filter(cell => cell.pnl < 0).length;
  const bestDay = activeDays.reduce((best, cell) => !best || cell.pnl > best.pnl ? cell : best, null);
  const selectedTrades = selectedDay ? grouped[selectedDay] || [] : [];
  const today = tradeDateKey(new Date().toISOString());

  const setCalendarMonth = (nextYear, nextMonth) => {
    setMonthKey(`${nextYear}-${String(nextMonth).padStart(2, "0")}`);
    setSelectedDay(null);
  };
  const moveMonth = direction => {
    const date = new Date(year, month - 1 + direction, 1);
    setCalendarMonth(date.getFullYear(), date.getMonth() + 1);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Summary icon={Target} label="Trades du mois" value={String(monthTrades.length)} color="#4F8CFF" />
        <Summary icon={monthPnl >= 0 ? TrendingUp : TrendingDown} label="Résultat net" value={money(monthPnl, { signDisplay: "always" })} color={monthPnl >= 0 ? "#46C99A" : "#F26A70"} />
        <Summary icon={CalendarDays} label="Jours actifs" value={String(activeDays.length)} color="#B58BFF" />
        <Summary icon={TrendingUp} label="Jours positifs" value={`${winningDays}/${activeDays.length || 0}`} color="#46C99A" sub={losingDays ? `${losingDays} jour${losingDays > 1 ? "s" : ""} négatif${losingDays > 1 ? "s" : ""}` : "Aucun jour négatif"} />
      </div>

      <section className="overflow-hidden rounded-[22px] border border-white/[0.08] bg-[#0B0E16]">
        <div className="flex flex-col gap-4 border-b border-white/[0.07] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <h2 className="text-sm font-semibold text-white">Calendrier des trades</h2>
            <p className="mt-1 text-[11px] text-[#70798A]">Clique sur une journée pour retrouver les opérations enregistrées.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => moveMonth(-1)} aria-label="Mois précédent" className="pe-icon-button"><ChevronLeft className="h-4 w-4" /></button>
            <select aria-label="Mois du calendrier" value={month} onChange={event => setCalendarMonth(year, Number(event.target.value))} className="pe-control min-w-[135px] text-xs">
              {MONTHS.map((name, index) => <option key={name} value={index + 1}>{name}</option>)}
            </select>
            <select aria-label="Année du calendrier" value={year} onChange={event => setCalendarMonth(Number(event.target.value), month)} className="pe-control min-w-[90px] text-xs">
              {availableYears.map(value => <option key={value} value={value}>{value}</option>)}
            </select>
            <button type="button" onClick={() => setCalendarMonth(new Date().getFullYear(), new Date().getMonth() + 1)} className="btn-ghost min-h-10 px-3 text-xs">Aujourd’hui</button>
            <button type="button" onClick={() => moveMonth(1)} aria-label="Mois suivant" className="pe-icon-button"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>

        <div className="grid grid-cols-7 border-b border-white/[0.07] bg-white/[0.015]">
          {WEEKDAYS.map(day => <div key={day} className="px-1 py-2.5 text-center text-[9px] font-semibold uppercase tracking-[.14em] text-[#626B7A] sm:text-[10px]">{day}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {cells.map(cell => {
            const active = selectedDay === cell.key;
            const hasTrades = cell.trades.length > 0;
            const positive = cell.pnl > 0;
            const negative = cell.pnl < 0;
            return (
              <button
                key={cell.key}
                type="button"
                disabled={!hasTrades}
                onClick={() => setSelectedDay(current => current === cell.key ? null : cell.key)}
                className={`relative min-h-[74px] border-b border-r border-white/[0.055] p-1.5 text-left transition sm:min-h-[108px] sm:p-3 ${!cell.inMonth ? "bg-black/20 text-[#373D49]" : hasTrades ? positive ? "bg-[#46C99A]/[0.06] text-[#8992A2] hover:bg-[#46C99A]/[0.09]" : negative ? "bg-[#F26A70]/[0.06] text-[#8992A2] hover:bg-[#F26A70]/[0.09]" : "bg-[#7C4DFF]/[0.04] text-[#8992A2] hover:bg-[#7C4DFF]/[0.07]" : "text-[#8992A2]"} ${hasTrades ? "cursor-pointer" : "cursor-default"} ${active ? "z-10 ring-1 ring-inset ring-[#7C4DFF]/60" : ""}`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className={`grid h-6 w-6 place-items-center rounded-full text-[10px] font-semibold sm:h-7 sm:w-7 sm:text-xs ${cell.key === today ? "bg-[#7C4DFF] text-white" : ""}`}>{cell.day}</span>
                  {hasTrades && <span className="hidden rounded-md border border-white/[0.07] px-1.5 py-0.5 text-[9px] text-[#788191] sm:block">{cell.trades.length} trade{cell.trades.length > 1 ? "s" : ""}</span>}
                </div>
                {hasTrades && <div className="mt-2 sm:mt-4"><div className={`truncate text-[10px] font-bold tabular-nums sm:text-sm ${positive ? "text-[#46C99A]" : negative ? "text-[#F26A70]" : "text-[#9C8EF0]"}`}>{money(cell.pnl, { notation: "compact", maximumFractionDigits: 1, signDisplay: "always" })}</div><div className="mt-1 flex gap-1">{cell.trades.slice(0, 4).map((trade, index) => <span key={`${trade.id}-${index}`} className={`h-1.5 w-1.5 rounded-full ${Number(trade.pnl || 0) > 0 ? "bg-[#46C99A]" : Number(trade.pnl || 0) < 0 ? "bg-[#F26A70]" : "bg-[#7C4DFF]"}`} />)}</div></div>}
              </button>
            );
          })}
        </div>

        <div className="border-t border-white/[0.07] p-4 sm:p-5">
          {selectedDay && selectedTrades.length ? (
            <DayDetails dayKey={selectedDay} trades={selectedTrades} money={money} formatDate={formatDate} />
          ) : (
            <div className="flex flex-col gap-2 text-xs text-[#70798A] sm:flex-row sm:items-center sm:justify-between"><span>{monthTrades.length ? "Sélectionne un jour actif pour afficher ses trades." : "Aucun trade enregistré pendant ce mois."}</span>{bestDay && <span>Meilleure journée : <strong className="text-[#46C99A]">{formatDate(bestDay.key)} · {money(bestDay.pnl, { signDisplay: "always" })}</strong></span>}</div>
          )}
        </div>
      </section>
    </div>
  );
}

function Summary({ icon: Icon, label, value, color, sub }) {
  return <div className="card-elev p-4 sm:p-5"><div className="flex items-center justify-between gap-2"><span className="text-[11px] text-[#7A8392] sm:text-xs">{label}</span><Icon className="h-4 w-4" style={{ color }} /></div><div className="mt-2 truncate text-xl font-bold tabular-nums sm:text-2xl" style={{ color }}>{value}</div>{sub && <div className="mt-1 truncate text-[9px] text-[#687180] sm:text-[10px]">{sub}</div>}</div>;
}

function DayDetails({ dayKey, trades, money, formatDate }) {
  const pnl = trades.reduce((sum, trade) => sum + Number(trade.pnl || 0), 0);
  return <div><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-sm font-semibold text-white">Trades du {formatDate(dayKey)}</h3><p className="mt-1 text-[10px] text-[#6F7785]">{trades.length} opération{trades.length > 1 ? "s" : ""} enregistrée{trades.length > 1 ? "s" : ""}</p></div><div className={`text-sm font-bold tabular-nums ${pnl > 0 ? "text-[#46C99A]" : pnl < 0 ? "text-[#F26A70]" : "text-[#9C8EF0]"}`}>{money(pnl, { signDisplay: "always" })}</div></div><div className="space-y-2">{trades.map(trade => <div key={trade.id} className="grid grid-cols-[1fr_auto] gap-3 rounded-xl border border-white/[0.06] bg-white/[0.018] px-3 py-3 sm:grid-cols-[minmax(100px,1fr)_100px_120px_100px] sm:items-center"><div><div className="text-xs font-semibold text-white">{trade.instrument || "Actif non renseigné"}</div><div className="mt-1 text-[9px] text-[#697282]">{trade.setup || "Setup non renseigné"}</div></div><div className="hidden text-[10px] capitalize text-[#8B93A3] sm:block">{trade.direction === "long" ? "Achat" : trade.direction === "short" ? "Vente" : trade.direction || "—"}</div><div className="hidden text-[10px] text-[#8B93A3] sm:block">{trade.session || "Session non renseignée"}</div><div className={`text-right text-xs font-semibold tabular-nums ${Number(trade.pnl || 0) > 0 ? "text-[#46C99A]" : Number(trade.pnl || 0) < 0 ? "text-[#F26A70]" : "text-[#9C8EF0]"}`}>{typeof trade.pnl === "number" ? money(trade.pnl, { signDisplay: "always" }) : "Ouvert"}</div></div>)}</div></div>;
}
