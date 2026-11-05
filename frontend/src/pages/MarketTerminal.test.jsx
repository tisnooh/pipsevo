import React, { act } from "react";
import { createRoot } from "react-dom/client";
import MarketTerminal from "./MarketTerminal";

jest.mock("@/context/AuthContext", () => ({ useAuth: () => ({ user: { trader_type: "futures" } }) }));
jest.mock("@/components/TradingViewChart", () => ({ symbol }) => <div data-testid="chart-symbol">{symbol}</div>);
jest.mock("@/components/PositionCalculator", () => () => null);

test("S&P embeds the documented CFD proxy and links the real ES contract separately", async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement("div"); document.body.appendChild(container);
  const root = createRoot(container);
  try {
    await act(async () => root.render(<MarketTerminal/>));
    const sp = [...container.querySelectorAll("button")].find(button => button.textContent === "S&P Futures");
    await act(async () => sp.click());
    expect(container.querySelector('[data-testid="chart-symbol"]').textContent).toBe("FOREXCOM:SPXUSD");
    expect(container.textContent).toContain("pas le contrat ES");
    expect(container.querySelector('a[href*="tradingview.com"]').href).toContain(encodeURIComponent("CME_MINI:ES1!"));
  } finally { await act(async () => root.unmount()); container.remove(); }
});
