import { confirmedLossStreak, configuredDisciplineRules, disciplineInsights } from "./disciplineMetrics";

test("clock-only closures are ordered by date before hour across sessions", () => {
  const rows = [{ date: "2026-10-09", exit_time: "23:00:00", pnl: -10 },
    { date: "2026-10-10", exit_time: "10:00:00", pnl: -20 },
    { date: "2026-10-11", exit_time: "09:00:00", pnl: 100 }];
  expect(confirmedLossStreak(rows)).toEqual({ count: 0, complete: true });
  expect(confirmedLossStreak(rows.slice(0, 2))).toEqual({ count: 2, complete: true });
});

test("les règles absentes ne deviennent pas des limites fictives", () => {
  expect(configuredDisciplineRules({})).toEqual({ maxTrades: null, stopAfter: null, dailyLimit: null, dailyCurrency: "USD" });
  expect(configuredDisciplineRules({ max_trades: 0, stop_after_loss: -2, daily_loss_limit: "" })).toMatchObject({ maxTrades: null, stopAfter: null, dailyLimit: null });
});

test("configurer plus tard ne confirme pas les valeurs proposées", () => {
  expect(configuredDisciplineRules({ configured: false, max_trades: 3, stop_after_loss: 2, daily_loss_limit: 300 })).toMatchObject({ maxTrades: null, stopAfter: null, dailyLimit: null });
});

test("les pertes successives utilisent les clôtures mesurées, pas les positions ouvertes", () => {
  expect(confirmedLossStreak([
    { date: "2026-10-10T12:00:00Z", result_status: "open", pnl: 500 },
    { date: "2026-10-10T11:00:00Z", result_status: "cancelled", pnl: 500 },
    { date: "2026-10-10T10:00:00Z", result_status: "loser", pnl: -100 },
    { date: "2026-10-10T09:00:00Z", result_status: "closed", pnl: -10 },
    { date: "2026-10-10T08:00:00Z", result_status: "winner", pnl: 200 },
  ])).toEqual({ count: 2, complete: true });
});

test("les résultats inconnus ne sont pas comptés comme une rupture gagnante", () => {
  expect(confirmedLossStreak([{ date: "2026-10-10", pnl: null }, { date: "2026-10-09", pnl: -100 }])).toEqual({ count: 0, complete: false });
  expect(confirmedLossStreak([{ date: "2026-10-10", pnl: -10 }, { date: "2026-10-09", pnl: null }])).toEqual({ count: 1, complete: false });
});

test("la date de clôture est prioritaire dans la série", () => {
  expect(confirmedLossStreak([
    { date: "2026-10-08", exit_time: "2026-10-10T12:00:00Z", pnl: -10 },
    { date: "2026-10-10", exit_time: "2026-10-10T11:00:00Z", pnl: 30 },
  ])).toEqual({ count: 1, complete: true });
});

test("les résultats du jour restent séparés par devise", () => {
  const trades = [
    { date: "2026-10-10", pnl: -100, provider_currency: "EUR", plan_respected: true },
    { date: "2026-10-10", pnl: 200, provider_currency: "USD", plan_respected: false },
    { date: "2026-10-10", pnl: 500, provider_currency: "EUR", result_status: "open" },
  ];
  expect(disciplineInsights(trades, { today: "2026-10-10", currency: "EUR" })).toMatchObject({ todayCount: 3, todayPnl: -100, planRate: 50, violations: 1 });
  expect(disciplineInsights(trades, { today: "2026-10-10", currency: "USD" }).todayPnl).toBe(200);
});

test("le résultat journalier est inconnu si une clôture manque dans la devise sélectionnée", () => {
  expect(disciplineInsights([
    { date: "2026-10-10", pnl: -100, provider_currency: "USD" },
    { date: "2026-10-10", pnl: null, provider_currency: "USD" },
  ], { today: "2026-10-10", currency: "USD" })).toMatchObject({ todayPnl: null, unknownCount: 1 });
});

test("le respect du plan n’est pas mesuré à partir de valeurs absentes ou annulées", () => {
  expect(disciplineInsights([{ date: "2026-10-10", pnl: 0, plan_respected: null }]).planRate).toBeNull();
  expect(disciplineInsights([{ date: "2026-10-10", pnl: 0, plan_respected: true, result_status: "cancelled" }]).planRate).toBeNull();
});
