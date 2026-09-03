import { getGuideBySlug, guides } from "./guides";

test("publishes six unique bilingual guides", () => {
  expect(guides).toHaveLength(6);
  expect(new Set(guides.map(guide => guide.slug)).size).toBe(guides.length);
  guides.forEach(guide => {
    expect(guide.title.fr).toBeTruthy();
    expect(guide.title.en).toBeTruthy();
    expect(guide.summary.fr).toBeTruthy();
    expect(guide.summary.en).toBeTruthy();
    expect(guide.sections.length).toBeGreaterThanOrEqual(3);
    expect(guide.checklist.fr.length).toBeGreaterThanOrEqual(4);
    expect(guide.checklist.en.length).toBeGreaterThanOrEqual(4);
  });
});

test("finds a guide by its public slug", () => {
  expect(getGuideBySlug("journal-trading-utile")?.number).toBe("01");
  expect(getGuideBySlug("missing-guide")).toBeUndefined();
});

