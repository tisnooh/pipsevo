import { BILLING_CONFIG, FEATURES, PLANS, canUseFeature, effectivePlan, hasPlanAccess } from "./billing";

describe("configuration commerciale PipsEvo", () => {
  test("centralise les trois prix attendus", () => {
    expect(BILLING_CONFIG.prices).toEqual({ essential: 9.99, pro: 19.99, betaLaunch: 4.99 });
    expect(PLANS.essential.price).toBe(BILLING_CONFIG.prices.essential);
    expect(PLANS.pro.price).toBe(BILLING_CONFIG.prices.pro);
  });

  test("la bêta ne débloque pas les fonctions premium", () => {
    expect(effectivePlan({ plan: "pro", subscription_status: "active" })).toBe("beta");
    expect(canUseFeature(null, "manualJournal")).toBe(true);
    expect(canUseFeature(null, "aiCoach")).toBe(false);
    expect(canUseFeature(null, "automaticReports")).toBe(false);
  });

  test("Essential et Pro possèdent des droits distincts", () => {
    expect(hasPlanAccess("essential", "manualJournal")).toBe(true);
    expect(hasPlanAccess("essential", "multipleAccounts")).toBe(false);
    expect(hasPlanAccess("pro", "multipleAccounts")).toBe(true);
    expect(hasPlanAccess("pro", "aiCoach")).toBe(true);
  });

  test("chaque fonctionnalité définit les trois niveaux", () => {
    Object.values(FEATURES).forEach((access) => {
      expect(access).toEqual(expect.objectContaining({ beta: expect.any(Boolean), essential: expect.any(Boolean), pro: expect.any(Boolean) }));
    });
  });
});
