import { getAccountDisplayMetrics } from "./accountDisplay";

describe("affichage des comptes synchronisés", () => {
  const account = { balance: 79941.49, initial_balance: 79941.49 };
  const providerAccount = { currency: "EUR", status: "connected" };

  test("une devise absente ou contradictoire ne devient pas automatiquement USD", () => {
    expect(getAccountDisplayMetrics({ ...account, integration_account_id: "linked", currency_available: false }, [], { status: "connected" })).toMatchObject({ currency: "UNKNOWN", currencyAvailable: false, balance: null, pnl: null, drawdownUsed: null });
  });

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

  test("utilise les clôtures manuelles du journal y compris les statuts winner/loser", () => {
    expect(getAccountDisplayMetrics({ balance: 50490, initial_balance: 50000, currency: "EUR" }, [
      { result_status: "winner", pnl: 100, provider_currency: "EUR" },
      { result_status: "loser", pnl: -10, provider_currency: "EUR" },
      { result_status: "open", pnl: 300, provider_currency: "EUR" },
    ])).toMatchObject({ pnl: 90, currency: "EUR", isSynced: false });
  });

  test("une clôture manuelle inconnue n’est pas remplacée par un gain supposé du solde", () => {
    expect(getAccountDisplayMetrics({ balance: 50490, initial_balance: 50000 }, [{ pnl: null, result_status: "closed" }]).pnl).toBeNull();
    expect(getAccountDisplayMetrics({ balance: null, initial_balance: 50000 })).toMatchObject({ balance: null, pnl: null });
  });

  test("un fournisseur sans seuil courant n’a pas de drawdown ou score inventé", () => {
    expect(getAccountDisplayMetrics({ balance: 52000, initial_balance: 50000, max_drawdown: 2500, health_score: 70 }, [], providerAccount)).toMatchObject({ drawdownUsed: null, healthScore: null });
    expect(getAccountDisplayMetrics({ balance: 52000, initial_balance: 50000, max_drawdown: 2500, max_drawdown_level: 51500 }, [], providerAccount)).toMatchObject({ drawdownUsed: 2000, drawdownSource: "provided_floor" });
  });

  test("un compte manuel legacy conserve ses USD même si la préférence est EUR", () => {
    expect(getAccountDisplayMetrics({ balance: 50490, initial_balance: 50000 }, [], null, "EUR").currency).toBe("USD");
  });

  test("ne mélange pas des résultats de devises différentes sur le même compte", () => {
    expect(getAccountDisplayMetrics({ balance: 51000, initial_balance: 50000, currency: "USD" }, [
      { pnl: 100, provider_currency: "USD", result_status: "closed" },
      { pnl: 300, provider_currency: "EUR", result_status: "closed" },
    ])).toMatchObject({ pnl: 100, currency: "USD", pnlMeasuredCount: 1, pnlOtherCurrencyCount: 1 });
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
