import { filterPropFirms, PROP_FIRMS } from "./propFirms";

describe("prop firm catalogue", () => {
  test("uses a complete auditable schema", () => {
    expect(PROP_FIRMS.length).toBeGreaterThanOrEqual(18);
    PROP_FIRMS.forEach((firm) => {
      expect(firm).toEqual(expect.objectContaining({
        name: expect.any(String), slug: expect.any(String), marketTypes: expect.any(Array),
        platforms: expect.any(Array), manualTrackingSupported: expect.any(Boolean),
        importSupported: expect.any(Boolean), autoSyncSupported: expect.any(Boolean),
        officialSource: expect.stringMatching(/^https:\/\//), lastVerifiedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      }));
    });
  });

  test("filters by market, platform and search text", () => {
    expect(filterPropFirms(PROP_FIRMS, { market: "futures" }).every((firm) => firm.marketTypes.includes("futures"))).toBe(true);
    expect(filterPropFirms(PROP_FIRMS, { platform: "mt5" }).every((firm) => firm.platforms.includes("mt5"))).toBe(true);
    expect(filterPropFirms(PROP_FIRMS, { query: "FTMO" }).map((firm) => firm.id)).toContain("ftmo");
    expect(filterPropFirms(PROP_FIRMS, { query: "TradeLocker" }).length).toBeGreaterThan(0);
    expect(filterPropFirms(PROP_FIRMS, { market: "crypto" }).map((firm) => firm.id)).toContain("breakout");
    expect(filterPropFirms(PROP_FIRMS, { platform: "volumetrica" }).map((firm) => firm.id)).toContain("goat-funded-trader");
  });
});
