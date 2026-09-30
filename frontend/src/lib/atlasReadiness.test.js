import { buildReadinessPayload, createReadinessForm, readinessPresentation } from "./atlasReadiness";

test("builds a typed readiness request from the form", () => {
  const form = {
    ...createReadinessForm("a1"),
    instrument: " ES ",
    planned_risk_percent: "0.5",
    entry: "100",
    stop: "99",
    take_profit: "102",
  };
  const checklist = [
    { id: "plan", label: "Plan", enabled: true, required: true },
    { id: "hidden", label: "Masqué", enabled: false },
  ];

  expect(buildReadinessPayload(form, checklist, { plan: true }, "2026-09-30")).toMatchObject({
    account_id: "a1",
    local_date: "2026-09-30",
    instrument: "ES",
    planned_risk_percent: 0.5,
    entry: 100,
    stop: 99,
    take_profit: 102,
    checklist_results: [{ id: "plan", label: "Plan", checked: true, required: true }],
  });
});

test("keeps absent numerical data unmeasured", () => {
  const payload = buildReadinessPayload(createReadinessForm("a1"), [], {}, "2026-09-30");
  expect(payload.entry).toBeNull();
  expect(payload.planned_risk_percent).toBeNull();
});

test("uses explicit process wording rather than a market signal", () => {
  expect(readinessPresentation("ready").title).toBe("Processus validé");
  expect(readinessPresentation("blocked").title).toBe("Position à suspendre");
});
