import { calculateTradeAnalytics, groupTradesByWeekday, measuredTradePnl, tradeOutcome } from "./tradeAnalytics";

test("MetaTrader ne certifie pas les anciens frais absents et accepte un vrai zéro", () => {
  const trade = { pnl: 100, result_status: "closed", source_provider: "metaapi" };
  expect(measuredTradePnl(trade)).toBeNull();
  expect(tradeOutcome(trade)).toBeNull();
  expect(measuredTradePnl({ ...trade, pnl: 0, provider_metadata: { pnl_source: "provider", net_pnl_available: true } })).toBe(0);
});

test("unusable historical pricing cannot establish a net winning outcome", () => {
  const trade = { pnl: 0, entry: 100, exit_price: 102, direction: "long", result_status: "closed", provider_metadata: { pnl_source: "derived_tick_cost", instrument_pricing: { tickCost: [{ tickCost: 0 }] } } };
  expect(measuredTradePnl(trade)).toBeNull();
  expect(tradeOutcome(trade)).toBeNull();
  expect(tradeOutcome({ ...trade, entry: null })).toBeNull();
  expect(tradeOutcome({ ...trade, result_status: "open" })).toBeNull();
  expect(measuredTradePnl({ pnl: 90, result_status: "open" })).toBeNull();
});

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

  test("ne confond pas des positions ouvertes avec un win rate de zéro", () => {
    const stats = calculateTradeAnalytics([{ pnl: null, result_status: "open" }], accounts);
    expect(stats.winrate).toBeNull();
    expect(stats.pnl).toBeNull();
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

  test("n'invente pas de résultat net à partir des prix sans P&L fournisseur", () => {
    const stats = calculateTradeAnalytics([
      { pnl: 0, direction: "short", entry: 4154.88, exit_price: 4146, result_status: "closed", integration_connection_id: "c1", provider_metadata: {} },
      { pnl: 0, direction: "long", entry: 30476.6, exit_price: 30479.5, result_status: "closed", integration_connection_id: "c1", provider_metadata: { pnl_source: "unavailable" } },
    ], accounts);

    expect(stats.winrate).toBeNull();
    expect(stats.wins).toBe(0);
    expect(stats.losses).toBe(0);
    expect(stats.pnl).toBeNull();
    expect(stats.avgWin).toBeNull();
  });

  test("distingue un zéro mesuré d'un ancien zéro de substitution", () => {
    expect(measuredTradePnl({ pnl: 0 })).toBe(0);
    expect(measuredTradePnl({ pnl: 0, source_provider: "tradelocker", provider_metadata: {} })).toBeNull();
    expect(measuredTradePnl({ pnl: -2.5, source_provider: "tradelocker", provider_metadata: { pnl_source: "unavailable" } })).toBeNull();
    expect(measuredTradePnl({ pnl: 0, source_provider: "tradelocker", provider_metadata: { pnl_source: "derived_tick_cost", net_pnl_available: true } })).toBe(0);
  });

  test("un mouvement favorable ne garantit pas un gain net après frais", () => {
    const trade = { pnl: 50, source_provider: "tradelocker", direction: "long", entry: 100, exit_price: 110, provider_metadata: { pnl_source: "provider", net_pnl_available: false } };
    expect(measuredTradePnl(trade)).toBeNull();
    expect(tradeOutcome(trade)).toBeNull();
    expect(tradeOutcome({ ...trade, pnl: -2, provider_metadata: { ...trade.provider_metadata, net_pnl_available: true } })).toBe(-1);
    expect(measuredTradePnl({ ...trade, provider_metadata: { pnl_source: "derived_tick_cost" } })).toBeNull();
  });

  test("affiche un profit factor infini quand tous les P&L mesurés sont gagnants", () => {
    const stats = calculateTradeAnalytics([{ pnl: 40 }, { pnl: 60 }], accounts);
    expect(stats.profitFactor).toBe(Infinity);
  });
});
