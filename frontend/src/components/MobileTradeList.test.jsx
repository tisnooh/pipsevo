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
});
