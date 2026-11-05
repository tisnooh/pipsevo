import React, { act } from "react";
import { createRoot } from "react-dom/client";
import MobileTradeList from "./MobileTradeList";

describe("MobileTradeList", () => {
  let container;
  let root;

  beforeEach(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  test("keeps every critical trade value accessible on mobile", () => {
    const onSelect = jest.fn();
    act(() => root.render(<MobileTradeList
      trades={[{ id: "trade-1", date: "2026-09-02", instrument: "ES", direction: "long", pnl: 100, r: 1.25, setup: "FVG" }]}
      formatMoney={(value) => `+${value} $US`}
      onSelect={onSelect}
    />));

    expect(container.textContent).toContain("ES");
    expect(container.textContent).toContain("Achat (Long)");
    expect(container.textContent).toContain("2026-09-02");
    expect(container.textContent).toContain("+100 $US");
    expect(container.textContent).toContain("+1.25R");
    expect(container.textContent).toContain("FVG");

    act(() => container.querySelector('button[aria-label^="Ouvrir le trade"]')
      .dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: "trade-1" }));
  });

  test("renders an explicit empty state", () => {
    act(() => root.render(<MobileTradeList trades={[]} emptyMessage="Aucun résultat" />));
    expect(container.textContent).toContain("Aucun résultat");
  });

  test.each([
    { result_status: "open", pnl: 999, r: 9.99 },
    { result_status: "cancelled", pnl: 999, r: 9.99 },
    { result_status: "closed", pnl: Infinity, r: 9.99 },
    { result_status: "closed", pnl: 999, r: 9.99, provider_metadata: { net_pnl_available: false } },
  ])("never labels an unmeasured result as realized: %p", trade => {
    act(() => root.render(<MobileTradeList
      trades={[{ id: "unmeasured", instrument: "NQ", ...trade, result: "USD 999", rLabel: "9.99R", toneClass: "text-[#46C99A]" }]}
      formatMoney={value => `USD ${value}`}
    />));
    expect(container.textContent).not.toContain("USD 999");
    expect(container.textContent).not.toContain("9.99R");
    expect(container.textContent).not.toContain("Infinity");
    expect(container.textContent).toContain(trade.result_status === "open" ? "Ouverte" : "—");
  });
});
