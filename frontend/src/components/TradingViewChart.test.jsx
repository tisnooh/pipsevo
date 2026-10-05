import React, { act } from "react";
import { createRoot } from "react-dom/client";
import TradingViewChart from "./TradingViewChart";

let mockResolvedTheme = "dark";
jest.mock("next-themes", () => ({ useTheme: () => ({ resolvedTheme: mockResolvedTheme }) }));

describe("TradingViewChart theme", () => {
  let container;
  let root;
  beforeEach(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    mockResolvedTheme = "dark";
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(() => { act(() => root.unmount()); container.remove(); });

  function config() {
    const source = container.querySelector("iframe").getAttribute("srcdoc");
    const parsed = new DOMParser().parseFromString(source, "text/html");
    return JSON.parse(parsed.querySelector("script").textContent);
  }

  test("uses the dark widget palette initially", () => {
    act(() => root.render(<TradingViewChart symbol="OANDA:NAS100USD" interval="15"/>));
    expect(config()).toMatchObject({ theme: "dark", backgroundColor: "#131722", symbol: "OANDA:NAS100USD", interval: "15" });
  });

  test("recreates the iframe with a light palette when the site theme changes", () => {
    act(() => root.render(<TradingViewChart/>));
    const darkFrame = container.querySelector("iframe");
    mockResolvedTheme = "light";
    act(() => root.render(<TradingViewChart/>));
    expect(container.querySelector("iframe")).not.toBe(darkFrame);
    expect(config()).toMatchObject({ theme: "light", backgroundColor: "#FFFFFF", gridColor: "rgba(79,93,132,0.12)" });
    expect(container.querySelector("iframe").getAttribute("srcdoc")).toContain("color-scheme:light");
  });

  test("retains the theme when changing instrument and timeframe", () => {
    mockResolvedTheme = "light";
    act(() => root.render(<TradingViewChart symbol="OANDA:EURUSD"/>));
    act(() => root.render(<TradingViewChart symbol="OANDA:XAUUSD" interval="D"/>));
    expect(config()).toMatchObject({ theme: "light", symbol: "OANDA:XAUUSD", interval: "D" });
  });
});
