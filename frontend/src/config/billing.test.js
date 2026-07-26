import { BILLING_CONFIG, FEATURES, PLANS, PRICING_COMPARISON, canUseFeature, effectivePlan, hasPlanAccess } from "./billing";

describe("configuration commerciale PipsEvo", () => {
  test("centralise les trois prix attendus", () => {
    expect(BILLING_CONFIG.prices).toEqual({ essential: 9.99, pro: 19.99, betaLaunch: 4.99 });
    expect(PLANS.essential.price).toBe(BILLING_CONFIG.prices.essential);
    expect(PLANS.pro.price).toBe(BILLING_CONFIG.prices.pro);
  });

  test("la bêta débloque les fonctions testées publiquement, sans ouvrir tout le premium", () => {
    expect(effectivePlan({ plan: "pro", subscription_status: "active" })).toBe("beta");
    expect(canUseFeature(null, "manualJournal")).toBe(true);
    expect(canUseFeature(null, "aiCoach")).toBe(true);
    expect(canUseFeature(null, "csvImport")).toBe(true);
    expect(canUseFeature(null, "automaticReports")).toBe(false);
    expect(canUseFeature(null, "mt5AutoSync")).toBe(false);
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

  test("la comparaison tarifaire couvre toujours les trois formules", () => {
    expect(PRICING_COMPARISON.length).toBeGreaterThan(0);
    PRICING_COMPARISON.forEach((section) => {
      expect(section.id).toBeTruthy();
      expect(section.rows.length).toBeGreaterThan(0);
      section.rows.forEach((row) => {
        expect(row).toEqual(expect.objectContaining({
          label: expect.any(String),
          beta: expect.anything(),
          essential: expect.anything(),
          pro: expect.anything(),
        }));
      });
    });
  });

  test("la bêta possède une présentation exploitable dans les cartes tarifaires", () => {
    expect(PLANS.beta.price).toBe(0);
    expect(PLANS.beta.description).toBeTruthy();
    expect(PLANS.beta.features.length).toBeGreaterThan(0);
  });
});
