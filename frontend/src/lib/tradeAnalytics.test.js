import { calculateTradeAnalytics, groupTradesByWeekday } from "./tradeAnalytics";

describe("statistiques synchronisées avec le journal", () => {
  const accounts = [
    { id: "a1", firm: "Topstep", name: "50K", balance: 999999, initial_balance: 1 },
    { id: "a2", firm: "FTMO", name: "Challenge", balance: 0, initial_balance: 0 },
  ];

  test("ignore les trades sans réponse pour le taux de respect du plan", () => {
    const stats = calculateTradeAnalytics([
      { account_id: "a1", pnl: 100, plan_respected: true, date: "2026-09-02" },
      { account_id: "a1", pnl: -20, plan_respected: false, date: "2026-09-03" },
      { account_id: "a1", pnl: 30, plan_respected: null, date: "2026-09-03" },
    ], accounts);
    expect(stats.planRate).toBe(50);
  });

  test("affiche un état non mesuré quand aucune réponse n'existe", () => {
    expect(calculateTradeAnalytics([{ pnl: 10, plan_respected: null }], accounts).planRate).toBeNull();
  });

  test("calcule la performance des comptes depuis la période filtrée", () => {
    const stats = calculateTradeAnalytics([
      { account_id: "a1", pnl: 120, date: "2026-09-02" },
      { account_id: "a2", pnl: -40, date: "2026-09-02" },
    ], accounts);
    expect(stats.accounts).toEqual([
      expect.objectContaining({ name: "Topstep · 50K", pnl: 120 }),
      expect.objectContaining({ name: "FTMO · Challenge", pnl: -40 }),
    ]);
  });

  test("regroupe une date métier sans décalage de jour", () => {
    const days = groupTradesByWeekday([{ date: "2026-09-02T23:30:00Z", pnl: 75 }]);
    expect(days.find(day => day.name === "Mer").pnl).toBe(75);
  });
});
