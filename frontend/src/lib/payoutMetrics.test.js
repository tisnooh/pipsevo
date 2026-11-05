import { payoutCurrency, payoutProjection, sumPayoutsByCurrency } from "./payoutMetrics";

test("les retraits en devises différentes ne sont jamais additionnés", () => {
  const totals = sumPayoutsByCurrency([
    { account_id: "eur", amount: "300" }, { account_id: "usd", amount: 200 },
    { account_id: "eur", amount: 100 }, { account_id: "usd", amount: null },
  ], [{ id: "eur", currency: "EUR" }, { id: "usd", currency: "USD" }]);
  expect(totals).toEqual({ EUR: 400, USD: 200 });
});

test("la devise du fournisseur ou du payout reste prioritaire", () => {
  expect(payoutCurrency({ currency: "USD" }, { currency: "GBP" })).toBe("GBP");
  expect(payoutCurrency({ currency: "USD" }, { currency: "GBP" }, { currency: "EUR" })).toBe("EUR");
  expect(payoutCurrency(null)).toBe("USD");
  expect(payoutCurrency({ currency_available: false, integration_account_id: "linked" })).toBe("UNKNOWN");
});

test("la projection reste un scénario saisi par l’utilisateur", () => {
  const result = payoutProjection("200", "20", "5000", new Date("2026-10-10T12:00:00Z"));
  expect(result).toMatchObject({ estimated: 4000, gap: -1000 });
  expect(result.estimatedDate.getDate()).toBe(30);
  expect(result.estimatedDate.getHours()).toBe(new Date("2026-10-10T12:00:00Z").getHours());
});

test.each([
  [null, 20, 5000], ["", 20, 5000], [-1, 20, 5000], [200, -1, 5000],
  [200, 1.5, 5000], [200, 3651, 5000], [200, 20, -1], [Infinity, 20, 5000],
])("une projection invalide reste inconnue (%s, %s, %s)", (daily, days, target) => {
  expect(payoutProjection(daily, days, target)).toBeNull();
});
