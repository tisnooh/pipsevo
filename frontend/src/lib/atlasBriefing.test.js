import { actionPlanProgress, briefingPnl, briefingPresentation, isAtlasBriefing, measuredValue, nextActionState } from "./atlasBriefing";

test("critical alerts have priority over warnings", () => {
  expect(briefingPresentation([{ severity: "warning" }, { severity: "critical" }]).label).toBe("Priorité requise");
});

test("action plan progress uses stable action ids", () => {
  const actions = [{ id: "weekly:risk" }, { id: "weekly:review" }];
  const state = nextActionState({}, "weekly:risk");
  expect(actionPlanProgress(actions, state)).toEqual({ completed: 1, total: 2, percent: 50 });
  expect(nextActionState(state, "weekly:risk")["weekly:risk"]).toBe(false);
});

test("missing values are never displayed as zero", () => {
  expect(measuredValue(null, "%")).toBe("Non mesuré");
  expect(measuredValue(0, "%")).toBe("0%");
});

test("le bilan conserve EUR et sépare les devises sans conversion", () => {
  expect(briefingPnl({ measured_pnl: 100, currency: "EUR" })).toContain("€");
  expect(briefingPnl({ measured_pnl: 100, currency: "EUR" })).not.toContain("$US");
  const mixed = briefingPnl({ measured_pnl: null, net_pnl_by_currency: { USD: 20, EUR: 100 } });
  expect(mixed).toContain("€"); expect(mixed).toContain("$US"); expect(mixed).toContain(" · ");
  expect(mixed).not.toContain("120");
});

test("une devise absente ou une réponse malformée n’est pas validée", () => {
  expect(briefingPnl({ measured_pnl: 100 })).toBe("Devise non renseignée");
  expect(briefingPnl({ measured_pnl: null })).toBe("Non mesuré");
  expect(isAtlasBriefing({ overview: {} })).toBe(false);
  expect(isAtlasBriefing({ overview: {}, alerts: [], action_plan: [], review_queue: [], explainability: { data_quality: {} } })).toBe(true);
  expect(briefingPresentation([]).label).not.toContain("stable");
});
