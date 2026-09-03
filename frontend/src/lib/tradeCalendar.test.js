import { CALENDAR_MONTHS_FR, buildMonthCells, buildTradeCalendarMonth, calendarYears, formatMonthLabel, groupTradesByDate, localDateKey, localMonthKey, shiftMonthKey, tradeDateKey } from "./tradeCalendar";

test("groups real trades by journal date", () => {
  const grouped = groupTradesByDate([
    { id: "1", date: "2026-09-01", pnl: 120 },
    { id: "2", date: "2026-09-01T14:30:00Z", pnl: -20 },
    { id: "3", date: "", pnl: 40 },
  ]);
  expect(grouped["2026-09-01"]).toHaveLength(2);
  expect(tradeDateKey("2026-09-01T14:30:00Z")).toBe("2026-09-01");
});

test("builds only the weeks needed by the selected month", () => {
  const grouped = groupTradesByDate([{ id: "1", date: "2026-09-01", pnl: 100 }]);
  const cells = buildMonthCells("2026-09", grouped);
  expect(cells).toHaveLength(35);
  expect(cells[0].key).toBe("2026-08-31");
  expect(cells.at(-1).key).toBe("2026-10-04");
  expect(cells.find(cell => cell.key === "2026-09-01")).toMatchObject({ inMonth: true, pnl: 100 });
});

test("keeps a sixth week only when the month genuinely needs it", () => {
  const cells = buildMonthCells("2026-08", {});
  expect(cells).toHaveLength(42);
  expect(cells[0].key).toBe("2026-07-27");
  expect(cells.at(-1).key).toBe("2026-09-06");
});

test("supports compact four-week months and year boundaries", () => {
  const february = buildMonthCells("2027-02", {});
  const december = buildMonthCells("2026-12", {});
  expect(february).toHaveLength(28);
  expect(february[0].key).toBe("2027-02-01");
  expect(february.at(-1).key).toBe("2027-02-28");
  expect(december.at(-1).key).toBe("2027-01-03");
});

test("creates local date and month keys without UTC rollover", () => {
  const localDate = new Date(2026, 8, 3, 0, 15);
  expect(localDateKey(localDate)).toBe("2026-09-03");
  expect(localMonthKey(localDate)).toBe("2026-09");
});

test("moves between months across year boundaries", () => {
  expect(shiftMonthKey("2026-01", -1)).toBe("2025-12");
  expect(shiftMonthKey("2026-12", 1)).toBe("2027-01");
  expect(shiftMonthKey("2026-09", 6)).toBe("2027-03");
});

test("exposes every month and every year needed by the calendar selectors", () => {
  expect(CALENDAR_MONTHS_FR).toHaveLength(12);
  expect(CALENDAR_MONTHS_FR.slice(0, 3)).toEqual(["Janvier", "Février", "Mars"]);
  expect(calendarYears([{ date: "2024-02-02" }], "2027-01", 2026)).toEqual([2027, 2026, 2025, 2024]);
});

test("keeps the month label, cells, active days and pnl synchronized", () => {
  const trades = [
    { id: "sep-1", date: "2026-09-02", pnl: 200 },
    { id: "sep-2", date: "2026-09-02T15:30:00Z", pnl: 100 },
    { id: "oct-1", date: "2026-10-05", pnl: -75 },
  ];
  const september = buildTradeCalendarMonth("2026-09", trades);
  const october = buildTradeCalendarMonth(shiftMonthKey("2026-09", 1), trades);
  const november = buildTradeCalendarMonth(shiftMonthKey("2026-09", 2), trades);

  expect(september).toMatchObject({ monthKey: "2026-09", label: "septembre 2026", activeDays: 1, tradeCount: 2, pnl: 300 });
  expect(september.cells.find(cell => cell.key === "2026-09-02")).toMatchObject({ inMonth: true, pnl: 300 });
  expect(october).toMatchObject({ monthKey: "2026-10", label: "octobre 2026", activeDays: 1, tradeCount: 1, pnl: -75 });
  expect(november).toMatchObject({ monthKey: "2026-11", label: "novembre 2026", activeDays: 0, tradeCount: 0, pnl: 0 });
  expect(formatMonthLabel("2027-01")).toBe("janvier 2027");
});
