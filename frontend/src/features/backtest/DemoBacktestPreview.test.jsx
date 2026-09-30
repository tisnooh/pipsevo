import React, { act } from "react";
import { createRoot } from "react-dom/client";
import DemoBacktestPreview from "./DemoBacktestPreview";

jest.mock("./api", () => ({
  usd: value => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(Number(value)),
}));
jest.mock("./ReplayChart", () => function FakeChart() {
  return <div aria-label="Graphique historique fictif"/>;
});

describe("DemoBacktestPreview", () => {
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

  test("identifies the sample as fictitious and displays completed demo analytics", () => {
    act(() => root.render(<DemoBacktestPreview onCreate={() => {}} onImport={() => {}}/>));

    expect(container.textContent).toContain("Démo interactive · données fictives");
    expect(container.textContent).toContain("Résultats simulés");
    expect(container.textContent).toContain("66,7 %");
    expect(container.textContent).toContain("642,50");
    expect(container.textContent).toContain("ne représente aucune performance réelle");
  });
});
