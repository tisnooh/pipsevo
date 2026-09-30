import { actionPlanProgress, briefingPresentation, measuredValue, nextActionState } from "./atlasBriefing";

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
