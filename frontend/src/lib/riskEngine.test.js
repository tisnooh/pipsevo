import { calculateSafeWithdrawal, evaluateRiskAlerts } from "./riskEngine";

describe("moteur de risque", () => {
  const account = { id: "a1", name: "Compte 50K", initial_balance: 50000, balance: 51000, max_drawdown: 2500, daily_loss_limit: 1000 };

  test("protège le seuil de drawdown avec une marge", () => {
    expect(calculateSafeWithdrawal(account, 20)).toEqual(expect.objectContaining({ failureFloor: 47500, protectedFloor: 48000, safeAmount: 3000, projectedBalance: 48000 }));
  });

  test("détecte une perte journalière et une série de pertes", () => {
    const alerts = evaluateRiskAlerts({
      accounts: [account],
      trades: [
        { account_id: "a1", date: "2026-07-25", pnl: -600, created_at: "2026-07-25T10:00:00Z" },
        { account_id: "a1", date: "2026-07-25", pnl: -500, created_at: "2026-07-25T11:00:00Z" },
      ],
      rules: { max_trades: 2, stop_after_loss: 2 },
      today: "2026-07-25",
    });
    expect(alerts.some(alert => alert.title.includes("perte journalière"))).toBe(true);
    expect(alerts.some(alert => alert.title.includes("pause recommandée"))).toBe(true);
  });
});
