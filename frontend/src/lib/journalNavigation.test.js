import { JOURNAL_DETAIL_ROUTE, JOURNAL_LIST_PATH, JOURNAL_LIST_ROUTE, journalTradePath, resolveJournalRoute } from "./journalNavigation";

const trades = [
  { id: "trade-es", date: "2026-09-02", instrument: "ES" },
  { id: "trade-nq", date: "2026-09-03", instrument: "NQ" },
];

test("TEST 1 — mobile Dashboard vers Journal ouvre toujours la liste", () => {
  expect(resolveJournalRoute("", trades)).toEqual({ dateFilter: "", selectedTrade: null });
  expect(resolveJournalRoute("?unrelated=1", trades)).toEqual({ dateFilter: "", selectedTrade: null });
});

test("TEST 2 — un clic volontaire sur ES construit la route du détail ES", () => {
  expect(journalTradePath("trade-es")).toBe(`${JOURNAL_LIST_PATH}/trade-es`);
  expect(resolveJournalRoute("", trades, "trade-es").selectedTrade).toBe(trades[0]);
});

test("TEST 3 — Retour à la liste supprime toute sélection", () => {
  expect(journalTradePath(null)).toBe(JOURNAL_LIST_PATH);
  expect(resolveJournalRoute("", trades).selectedTrade).toBeNull();
});

test("TEST 4 — quitter puis rouvrir Journal ne restaure pas l'ancien trade", () => {
  expect(resolveJournalRoute("", trades, "trade-es").selectedTrade).toBe(trades[0]);
  expect(resolveJournalRoute("", trades).selectedTrade).toBeNull();
});

test("TEST 5 — un refresh de la route Journal propre reste sur la liste", () => {
  expect(resolveJournalRoute("", trades)).toEqual({ dateFilter: "", selectedTrade: null });
});

test("TEST 6 — un accès direct à /journal/:tradeId ouvre le trade demandé", () => {
  expect(JOURNAL_LIST_ROUTE).toBe("journal");
  expect(JOURNAL_DETAIL_ROUTE).toBe("journal/:tradeId");
  expect(resolveJournalRoute("", trades, "trade-nq").selectedTrade).toBe(trades[1]);
  expect(resolveJournalRoute("", trades, "trade-inconnu").selectedTrade).toBeNull();
});

test("TEST 7 — la résolution desktop reste explicite et indépendante du viewport", () => {
  expect(resolveJournalRoute("", trades).selectedTrade).toBeNull();
  expect(resolveJournalRoute("", trades, "trade-es").selectedTrade).toBe(trades[0]);
});

test("TEST 8 — les navigations mobiles répétées ne restaurent jamais un détail", () => {
  for (let index = 0; index < 5; index += 1) {
    expect(resolveJournalRoute("", trades).selectedTrade).toBeNull();
  }
});

test("les anciens liens explicites et les liens de journée restent compatibles", () => {
  expect(resolveJournalRoute("?trade=trade-es", trades).selectedTrade).toBe(trades[0]);
  expect(resolveJournalRoute("?date=2026-09-03", trades)).toEqual({
    dateFilter: "2026-09-03",
    selectedTrade: trades[1],
  });
});

test("les identifiants sont encodés dans l'URL du détail", () => {
  expect(journalTradePath("trade avec espace")).toBe(`${JOURNAL_LIST_PATH}/trade%20avec%20espace`);
});
