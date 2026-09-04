import React from "react";
import { ChevronRight, Star } from "lucide-react";

const pnlTone = (trade) => {
  if (trade.toneClass) return trade.toneClass;
  if (typeof trade.pnl !== "number" || trade.pnl === 0) return "text-[#9CA3AF]";
  return trade.pnl > 0 ? "text-[#46C99A]" : "text-[#F26A70]";
};

export default function MobileTradeList({
  trades,
  formatDate = (value) => value || "—",
  formatMoney = (value) => value,
  onSelect,
  onToggleFavorite,
  emptyMessage = "Aucun trade dans cette sélection.",
}) {
  if (!trades.length) {
    return <div className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-center text-sm text-[#7E8798] md:hidden">{emptyMessage}</div>;
  }

  return <div className="grid gap-2 md:hidden" role="list" aria-label="Trades">
    {trades.map((trade) => {
      const asset = trade.asset || trade.instrument || "—";
      const direction = trade.direction === "long" ? "Achat (Long)" : trade.direction === "short" ? "Vente (Short)" : trade.direction || "—";
      const result = trade.result || (typeof trade.pnl === "number" ? formatMoney(trade.pnl) : "—");
      const rLabel = trade.rLabel || (typeof trade.r === "number" ? `${trade.r >= 0 ? "+" : ""}${trade.r.toFixed(2)}R` : "—");
      const dateLabel = trade.dateLabel || formatDate(trade.date);
      const tone = pnlTone(trade);

      return <article key={trade.id} role="listitem" className="rounded-2xl border border-[#6571CF]/20 bg-[#0D1120] p-3.5">
        <div className="flex min-w-0 items-start gap-2">
          {onToggleFavorite && <button
            type="button"
            onClick={(event) => onToggleFavorite(trade, event)}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-[#5F6878] transition hover:bg-white/[0.04] hover:text-yellow-400 focus-visible:text-yellow-300"
            aria-label={trade.starred ? `Retirer ${asset} des favoris` : `Ajouter ${asset} aux favoris`}
          ><Star className={`h-[18px] w-[18px] ${trade.starred ? "fill-yellow-400 text-yellow-400" : ""}`} /></button>}
          <button
            type="button"
            onClick={() => onSelect?.(trade)}
            className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C4DFF]/70"
            aria-label={`Ouvrir le trade ${asset} du ${dateLabel}`}
          >
            <span className="min-w-0 flex-1">
              <span className="flex min-w-0 items-center gap-2">
                <strong className="truncate text-sm text-white">{asset}</strong>
                <span className={`truncate text-xs ${tone}`}>{direction}</span>
              </span>
              <span className="mt-1 flex min-w-0 items-center gap-2 text-xs text-[#7E8798]">
                <span className="truncate">{dateLabel}</span>
                {(trade.setup || trade.tags?.[0]) && <><span aria-hidden="true">·</span><span className="truncate">{trade.setup || trade.tags[0]}</span></>}
              </span>
            </span>
            <span className="shrink-0 text-right">
              <span className={`block font-numeric text-sm font-semibold ${tone}`}>{result}</span>
              <span className="mt-1 block font-numeric text-xs text-[#9CA3AF]">{rLabel}</span>
            </span>
            {onSelect && <ChevronRight className="h-4 w-4 shrink-0 text-[#5F6878]" aria-hidden="true" />}
          </button>
        </div>
      </article>;
    })}
  </div>;
}
