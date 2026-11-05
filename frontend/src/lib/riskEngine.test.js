import { calculateSafeWithdrawal, evaluateRiskAlerts, finiteFinancialNumber, resolveAccountDrawdown } from "./riskEngine";

describe("moteur de risque", () => {
  const account = { id: "a1", name: "Compte 50K", initial_balance: 50000, balance: 51000, max_drawdown: 2500, daily_loss_limit: 1000 };

  test("protège le seuil de drawdown avec une marge", () => {
    expect(calculateSafeWithdrawal(account, 20)).toEqual(expect.objectContaining({ failureFloor: 47500, protectedFloor: 48000, safeAmount: 1000, projectedBalance: 50000 }));
  });

  test.each([50000, 49000, 47500])("ne retire pas le capital initial pour un solde de %s", balance => {
    expect(calculateSafeWithdrawal({ ...account, balance }).safeAmount).toBe(0);
  });

  test("respecte le seuil fournisseur même au-dessus du solde initial", () => {
    expect(calculateSafeWithdrawal({ ...account, balance: 53000, max_drawdown_level: 51500 }, 20)).toMatchObject({ safeAmount: 1000, failureFloor: 51500, projectedBalance: 52000 });
  });

  test("utilise le drawdown rapporté au lieu du solde initial pour les alertes", () => {
    const value = { ...account, balance: 52000, current_drawdown: 2400 };
    expect(resolveAccountDrawdown(value)).toMatchObject({ remainingDrawdown: 100, drawdownUsed: 2400 });
    expect(evaluateRiskAlerts({ accounts: [value] }).some(alert => alert.title.includes("marge de drawdown faible"))).toBe(true);
    expect(resolveAccountDrawdown({ ...value, current_drawdown: 3000 })).toMatchObject({ remainingDrawdown: 0, drawdownUsed: 3000 });
  });

  test("ne suppose pas de seuil suiveur inconnu", () => {
    const trailing = { ...account, drawdown_mode: "trailing" };
    expect(resolveAccountDrawdown(trailing)).toBeNull();
    expect(calculateSafeWithdrawal(trailing)).toBeNull();
    expect(evaluateRiskAlerts({ accounts: [trailing] })).toEqual(expect.arrayContaining([expect.objectContaining({ title: "Compte 50K : drawdown non vérifiable", severity: "warning" })]));
    expect(resolveAccountDrawdown({ ...trailing, balance: 54000, high_water_mark: 55000 })).toMatchObject({ failureFloor: 52500, remainingDrawdown: 1500 });
  });

  test("utilise la référence d’équité uniquement quand elle est renseignée", () => {
    expect(resolveAccountDrawdown({ ...account, drawdown_basis: "equity", max_drawdown_level: 47500 })).toBeNull();
    expect(resolveAccountDrawdown({ ...account, drawdown_basis: "equity", equity: 47800, max_drawdown_level: 47500 })).toMatchObject({ remainingDrawdown: 300 });
    expect(calculateSafeWithdrawal({ ...account, balance: 53000, drawdown_basis: "equity", equity: 50000, max_drawdown_level: 49500 }, 20)).toMatchObject({ safeAmount: 0, protectedFloor: 50000 });
  });

  test.each([null, undefined, "", " ", false, NaN, Infinity, [], {}])("préserve la valeur financière inconnue %s", value => {
    expect(finiteFinancialNumber(value)).toBeNull();
    expect(calculateSafeWithdrawal({ ...account, balance: value })).toBeNull();
  });

  test.each([-1, 101, "", NaN])("rejette une marge de sécurité invalide %s", value => {
    expect(calculateSafeWithdrawal(account, value)).toBeNull();
  });

  test("ne calcule pas de retrait sans règles de drawdown ou sans capital initial", () => {
    expect(calculateSafeWithdrawal({ ...account, max_drawdown: 0 })).toBeNull();
    expect(calculateSafeWithdrawal({ ...account, initial_balance: null })).toBeNull();
  });

  test("détecte une perte journalière et une série de pertes", () => {
    const alerts = evaluateRiskAlerts({
      accounts: [account],
      trades: [
        { account_id: "a1", date: "2026-07-25T09:30:00Z", pnl: -600, created_at: "2026-07-25T10:00:00Z" },
        { account_id: "a1", date: "2026-07-25", pnl: -500, created_at: "2026-07-25T11:00:00Z" },
      ],
      rules: { max_trades: 2, stop_after_loss: 2 },
      today: "2026-07-25",
    });
    expect(alerts.some(alert => alert.title.includes("perte journalière"))).toBe(true);
    expect(alerts.some(alert => alert.title.includes("pause recommandée"))).toBe(true);
  });

  test("ne convertit pas un résultat inconnu en zéro dans la perte journalière", () => {
    const alerts = evaluateRiskAlerts({ accounts: [account], trades: [
      { account_id: "a1", date: "2026-07-25", pnl: -1100 },
      { account_id: "a1", date: "2026-07-25", pnl: null },
    ], today: "2026-07-25" });
    expect(alerts.some(alert => alert.title.includes("perte journalière non vérifiable"))).toBe(true);
    expect(alerts.some(alert => alert.title.includes("perte journalière atteinte"))).toBe(false);
  });

  test("exclut les résultats flottants et annulés et garde les pertes clôturées", () => {
    const alerts = evaluateRiskAlerts({ accounts: [account], rules: { stop_after_loss: 2 }, today: "2026-07-25", trades: [
      { account_id: "a1", date: "2026-07-25T10:00:00Z", pnl: -2000, result_status: "open" },
      { account_id: "a1", date: "2026-07-25T09:00:00Z", pnl: -10000, result_status: "cancelled" },
      { account_id: "a1", date: "2026-07-25T08:00:00Z", pnl: -100, result_status: "closed" },
      { account_id: "a1", date: "2026-07-25T07:00:00Z", pnl: -100, result_status: "closed" },
    ] });
    expect(alerts.some(alert => alert.title.includes("perte journalière atteinte"))).toBe(false);
    expect(alerts.some(alert => alert.title.includes("pause recommandée"))).toBe(true);
  });

  test("un résultat inconnu interrompt la confirmation d’une série de pertes", () => {
    const alerts = evaluateRiskAlerts({ accounts: [account], rules: { stop_after_loss: 2 }, today: "2026-07-25", trades: [
      { account_id: "a1", date: "2026-07-25T10:00:00Z", pnl: null },
      { account_id: "a1", date: "2026-07-25T08:00:00Z", pnl: -100 },
      { account_id: "a1", date: "2026-07-25T07:00:00Z", pnl: -100 },
    ] });
    expect(alerts.some(alert => alert.title.includes("pause recommandée"))).toBe(false);
  });

  test("respecte une limite quotidienne explicitement désactivée", () => {
    const alerts = evaluateRiskAlerts({ accounts: [{ ...account, daily_loss_limit: 0 }], rules: { daily_loss_limit: 10 }, today: "2026-07-25", trades: [
      { account_id: "a1", date: "2026-07-25", pnl: -100 },
    ] });
    expect(alerts).toEqual([]);
  });

  test("les devises mélangées n’engendrent pas de violation journalière calculée", () => {
    const alerts = evaluateRiskAlerts({ accounts: [account], today: "2026-07-25", trades: [
      { account_id: "a1", date: "2026-07-25", pnl: -1200, provider_currency: "USD" },
      { account_id: "a1", date: "2026-07-25", pnl: 1000, provider_currency: "EUR" },
    ] });
    expect(alerts).toEqual(expect.arrayContaining([expect.objectContaining({ title: "Compte 50K : perte journalière non vérifiable", detail: expect.stringContaining("plusieurs devises") })]));
  });

  test("les limites conseillées non confirmées ne créent pas d’alertes", () => {
    expect(evaluateRiskAlerts({ accounts: [{ ...account, daily_loss_limit: null }], rules: { configured: false, daily_loss_limit: 10, max_trades: 1, stop_after_loss: 1 }, today: "2026-07-25", trades: [
      { account_id: "a1", date: "2026-07-25", pnl: -100 },
    ] })).toEqual([]);
  });

  test("une limite globale USD ne valide pas les pertes d’un compte EUR", () => {
    const alerts = evaluateRiskAlerts({ accounts: [{ ...account, currency: "EUR", daily_loss_limit: null }], rules: { daily_loss_limit: 100, daily_loss_currency: "USD" }, today: "2026-07-25", trades: [
      { account_id: "a1", date: "2026-07-25", pnl: -120, provider_currency: "EUR" },
    ] });
    expect(alerts).toEqual([expect.objectContaining({ severity: "warning", title: expect.stringContaining("non vérifiable"), detail: expect.stringContaining("USD") })]);
  });

  test("la limite du compte reste prioritaire et utilise sa devise native", () => {
    const alerts = evaluateRiskAlerts({ accounts: [{ ...account, currency: "EUR", daily_loss_limit: 100 }], rules: { daily_loss_limit: 1000, daily_loss_currency: "USD" }, today: "2026-07-25", trades: [
      { account_id: "a1", date: "2026-07-25", pnl: -120, provider_currency: "EUR" },
    ] });
    expect(alerts).toEqual([expect.objectContaining({ severity: "critical", title: expect.stringContaining("perte journalière atteinte") })]);
  });

  test("les comptes inactifs ne produisent pas d’alertes et les annulations ne sont pas des trades pris", () => {
    expect(evaluateRiskAlerts({ accounts: [{ ...account, status: "failed", current_drawdown: 3000 }] })).toEqual([]);
    expect(evaluateRiskAlerts({ accounts: [account], rules: { max_trades: 1 }, today: "2026-07-25", trades: [
      { account_id: "a1", date: "2026-07-25", result_status: "cancelled", pnl: -1000 },
    ] })).toEqual([]);
  });
});
