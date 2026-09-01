import { calculateCfdSize, calculateFuturesSize } from "./positionSizing";

describe("calculateCfdSize", () => {
  it("calcule la taille théorique en lots", () => {
    expect(calculateCfdSize({ capital: 50000, riskPercent: 1, stopDistance: 20, pointValue: 10 })).toEqual({
      riskAmount: 500,
      lossPerLot: 200,
      lots: 2.5,
    });
  });

  it("retourne une taille nulle si le stop est invalide", () => {
    expect(calculateCfdSize({ capital: 50000, riskPercent: 1, stopDistance: 0, pointValue: 10 }).lots).toBe(0);
  });
});

describe("calculateFuturesSize", () => {
  it("arrondit MNQ à un nombre entier de contrats", () => {
    expect(calculateFuturesSize({ capital: 50000, riskPercent: 1, stopTicks: 40, tickValue: 0.5 })).toEqual({
      riskBudget: 500,
      lossPerContract: 20,
      contracts: 25,
      actualRisk: 500,
      unusedRisk: 0,
    });
  });

  it("ne dépasse pas le budget de risque avec NQ", () => {
    expect(calculateFuturesSize({ capital: 50000, riskPercent: 1, stopTicks: 40, tickValue: 5 })).toEqual({
      riskBudget: 500,
      lossPerContract: 200,
      contracts: 2,
      actualRisk: 400,
      unusedRisk: 100,
    });
  });
});
