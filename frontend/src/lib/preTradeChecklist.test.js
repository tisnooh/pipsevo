import { clearPreTradeChecks, normalizePreTradeChecks, PRE_TRADE_CHECKS_KEY, readPreTradeChecks, writePreTradeChecks } from "./preTradeChecklist";

const checklist = [{ id: "plan" }, { id: "risk" }, { id: "stop" }];

afterEach(() => localStorage.clear());

test("normalizes legacy arrays and ignores stale checklist entries", () => {
  expect(normalizePreTradeChecks([true, false, true], checklist)).toEqual({ plan: true, risk: false, stop: true });
  expect(normalizePreTradeChecks({ plan: true, removed: true }, checklist)).toEqual({ plan: true, risk: false, stop: false });
});

test("shares and clears the current pre-trade checklist", () => {
  writePreTradeChecks({ plan: true, risk: true }, checklist);
  expect(readPreTradeChecks(checklist)).toEqual({ plan: true, risk: true, stop: false });
  expect(JSON.parse(localStorage.getItem(PRE_TRADE_CHECKS_KEY))).toEqual({ plan: true, risk: true, stop: false });
  clearPreTradeChecks();
  expect(readPreTradeChecks(checklist)).toEqual({ plan: false, risk: false, stop: false });
});

test("browser storage failures never interrupt checklist editing or saving a trade", () => {
  const set = jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Blocked"); });
  const remove = jest.spyOn(Storage.prototype, "removeItem").mockImplementation(() => { throw new Error("Blocked"); });
  try {
    expect(writePreTradeChecks({ plan: true }, checklist)).toEqual({ plan: true, risk: false, stop: false });
    expect(() => clearPreTradeChecks()).not.toThrow();
  } finally { set.mockRestore(); remove.mockRestore(); }
});
