export const JOURNAL_LIST_PATH = "/app/journal";
export const JOURNAL_LIST_ROUTE = "journal";
export const JOURNAL_DETAIL_ROUTE = `${JOURNAL_LIST_ROUTE}/:tradeId`;

export function journalTradePath(tradeId) {
  if (tradeId === null || tradeId === undefined || tradeId === "") return JOURNAL_LIST_PATH;
  return `${JOURNAL_LIST_PATH}/${encodeURIComponent(String(tradeId))}`;
}

export function resolveJournalRoute(search, trades = [], routeTradeId = "") {
  const params = new URLSearchParams(search || "");
  const tradeId = routeTradeId || params.get("trade") || "";
  const dateFilter = params.get("date") || "";

  if (tradeId) {
    return {
      dateFilter,
      selectedTrade: trades.find((trade) => String(trade.id) === tradeId) || null,
    };
  }

  if (dateFilter) {
    return {
      dateFilter,
      selectedTrade: trades.find((trade) => String(trade.date || "").slice(0, 10) === dateFilter) || null,
    };
  }

  return { dateFilter: "", selectedTrade: null };
}
