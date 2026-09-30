import { createDefaultTradingPlan, hasTradingPlanContent, normalizeTradingPlan } from "./tradingPlan";

test("normalizes a missing trading plan to editable defaults", () => {
  expect(normalizeTradingPlan(null)).toEqual(createDefaultTradingPlan());
  expect(hasTradingPlanContent(null)).toBe(false);
});

test("keeps only supported text fields", () => {
  const plan = normalizeTradingPlan({ mission: "Protéger le capital", role: "admin", entry_rules: ["bad"] });
  expect(plan.mission).toBe("Protéger le capital");
  expect(plan.role).toBeUndefined();
  expect(plan.entry_rules).toBe("");
  expect(hasTradingPlanContent(plan)).toBe(true);
});

test("caps each long section so the complete plan stays within the database limit", () => {
  expect(normalizeTradingPlan({ notes: "x".repeat(7000) }).notes).toHaveLength(5000);
});
