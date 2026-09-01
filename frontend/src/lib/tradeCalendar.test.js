import { buildMonthCells, groupTradesByDate, tradeDateKey } from "./tradeCalendar";

test("groups real trades by journal date", () => {
  const grouped = groupTradesByDate([
    { id: "1", date: "2026-09-01", pnl: 120 },
    { id: "2", date: "2026-09-01T14:30:00Z", pnl: -20 },
    { id: "3", date: "", pnl: 40 },
  ]);
  expect(grouped["2026-09-01"]).toHaveLength(2);
  expect(tradeDateKey("2026-09-01T14:30:00Z")).toBe("2026-09-01");
});

test("builds a stable six-week calendar with daily pnl", () => {
  const grouped = groupTradesByDate([{ id: "1", date: "2026-09-01", pnl: 100 }]);
  const cells = buildMonthCells("2026-09", grouped);
  expect(cells).toHaveLength(42);
  expect(cells.find(cell => cell.key === "2026-09-01")).toMatchObject({ inMonth: true, pnl: 100 });
});
