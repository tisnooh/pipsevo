import { getAccountDisplayMetrics } from "./accountDisplay";

describe("affichage des comptes synchronisés", () => {
  const account = { balance: 79941.49, initial_balance: 79941.49 };
  const providerAccount = { currency: "EUR", status: "connected" };

  test("calcule le P&L réalisé depuis les clôtures, sans compter une position ouverte", () => {
    const metrics = getAccountDisplayMetrics(account, [
      { result_status: "closed", pnl: -47.72, provider_currency: "EUR" },
      { result_status: "closed", pnl: -10.79, provider_currency: "EUR" },
      { result_status: "open", pnl: -20.12, provider_currency: "EUR" },
    ], providerAccount);

    expect(metrics).toMatchObject({ balance: 79941.49, currency: "EUR", pnl: -58.51, isSynced: true });
  });

  test("laisse le P&L non renseigné quand le compte synchronisé n'a pas de clôture mesurée", () => {
    expect(getAccountDisplayMetrics(account, [], providerAccount).pnl).toBeNull();
  });

  test("préserve le calcul solde moins solde initial pour un compte manuel", () => {
    expect(getAccountDisplayMetrics({ balance: 50490, initial_balance: 50000 }).pnl).toBe(490);
  });

  test("applique les mêmes règles aux nouveaux comptes TradeLocker et à leur devise native", () => {
    const imported = { id: "new-tradelocker", balance: 10146, initial_balance: 10000, max_drawdown: 0 };
    const metrics = getAccountDisplayMetrics(imported, [
      { source_provider: "tradelocker", result_status: "closed", pnl: 196, provider_currency: "GBP", provider_metadata: { pnl_source: "provider", net_pnl_available: true } },
      { source_provider: "tradelocker", result_status: "closed", pnl: -50, provider_currency: "GBP", provider_metadata: { pnl_source: "derived_tick_cost", net_pnl_available: true } },
      { source_provider: "tradelocker", result_status: "open", pnl: 999, provider_currency: "GBP" },
      { source_provider: "tradelocker", result_status: "closed", pnl: 0, provider_currency: "GBP", provider_metadata: { pnl_source: "unavailable" } },
    ], { provider: "tradelocker", currency: "GBP", status: "connected" }, "EUR");
    expect(metrics).toMatchObject({ currency: "GBP", pnl: 146, isSynced: true, healthScore: null, survivalScore: null });
  });

  test("n'affiche pas de scores de risque sans limite configurée ou pour un compte désactivé", () => {
    const scored = { ...account, health_score: 70, survival_score: 95, max_drawdown: 0 };
    expect(getAccountDisplayMetrics(scored, [], providerAccount)).toMatchObject({ healthScore: null, survivalScore: null });
    expect(getAccountDisplayMetrics({ ...scored, max_drawdown: 2000 }, [], { ...providerAccount, status: "error" })).toMatchObject({ healthScore: null, survivalScore: null });
    expect(getAccountDisplayMetrics({ ...scored, max_drawdown: 2000, current_drawdown: 500 }, [], providerAccount)).toMatchObject({ healthScore: 70, survivalScore: 95, drawdownUsed: 500 });
  });
});
