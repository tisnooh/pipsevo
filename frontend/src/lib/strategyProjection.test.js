import { calculateProjection, INITIAL_PROJECTION, projectionInputs } from "./strategyProjection";

test("deterministic projection preserves exact trade and win counts", () => {
  const result = calculateProjection(INITIAL_PROJECTION);
  expect(result.wins).toBe(55);
  expect(result.losses).toBe(45);
  expect(result.curve).toHaveLength(101);
  expect(result.final).toBeCloseTo(10000 * 1.02 ** 55 * 0.99 ** 45, 6);
  expect(result.actualWinrate).toBeCloseTo(55);
  expect(result.maxDd).toBeGreaterThanOrEqual(0);
  expect(calculateProjection(INITIAL_PROJECTION)).toEqual(result);
});

test.each([0, 100])("handles a %s percent win rate without fake variance", winrate => {
  const result = calculateProjection({ ...INITIAL_PROJECTION, trades: 10, winrate });
  expect(result.wins).toBe(winrate === 100 ? 10 : 0);
  expect(result.final).toBeCloseTo(10000 * (winrate === 100 ? 1.02 : 0.99) ** 10);
  if (winrate === 100) expect(result.maxDd).toBe(0);
});

test.each([{ trades: 0 }, { trades: 1.5 }, { trades: 5001 }, { capital: Infinity }, { capital: "" },
  { winrate: -1 }, { winrate: 101 }, { risk: 11 }, { loss: 100, risk: 1 }, { gain: NaN }])("rejects unsafe input %p", patch => {
  const input = { ...INITIAL_PROJECTION, ...patch };
  expect(projectionInputs(input)).toBeNull();
  expect(() => calculateProjection(input)).toThrow();
});

test("rejects explosive compounding instead of displaying Infinity", () => {
  expect(() => calculateProjection({ ...INITIAL_PROJECTION, trades: 5000, winrate: 100, gain: 100, risk: 10 })).toThrow(/plage/);
});
