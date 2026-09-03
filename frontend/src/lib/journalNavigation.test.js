import { JOURNAL_LIST_PATH, journalTradePath, resolveJournalRoute } from "./journalNavigation";

const trades = [
  { id: "trade-es", date: "2026-09-02", instrument: "ES" },
  { id: "trade-nq", date: "2026-09-03", instrument: "NQ" },
];

test("the main Journal route always opens the trade list", () => {
  expect(resolveJournalRoute("", trades)).toEqual({ dateFilter: "", selectedTrade: null });
  expect(resolveJournalRoute("?unrelated=1", trades)).toEqual({ dateFilter: "", selectedTrade: null });
});

test("a trade is selected only from an explicit trade route", () => {
  expect(journalTradePath("trade-es")).toBe(`${JOURNAL_LIST_PATH}?trade=trade-es`);
  expect(resolveJournalRoute("?trade=trade-es", trades).selectedTrade).toBe(trades[0]);
  expect(resolveJournalRoute("?trade=missing", trades).selectedTrade).toBeNull();
});

test("the existing day link can still open the matching journal trade", () => {
  expect(resolveJournalRoute("?date=2026-09-03", trades)).toEqual({
    dateFilter: "2026-09-03",
    selectedTrade: trades[1],
  });
});
