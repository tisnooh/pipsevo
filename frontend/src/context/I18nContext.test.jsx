import React, { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { I18nProvider, useI18n } from "./I18nContext";
import { SETTINGS_KEY } from "../lib/preferences";

jest.mock("@/lib/preferences", () => require("../lib/preferences"), { virtual: true });

function DynamicContent() {
  const [count, setCount] = useState(0);
  const { setLanguage } = useI18n();
  return <div>
    <button type="button" onClick={() => setCount(value => value + 1)}>Increment</button>
    <button type="button" onClick={() => setLanguage("fr")}>FR</button>
    <button type="button" onClick={() => setLanguage("en")}>EN</button>
    <span data-testid="count">{count}</span>
    <span data-testid="sentence">conditions validées</span>
    <input aria-label={count ? `Valeur ${count}` : "Valeur"} />
  </div>;
}

describe("I18nProvider dynamic content", () => {
  let container;
  let root;

  beforeEach(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ language: "fr" }));
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root.render(<I18nProvider><DynamicContent /></I18nProvider>));
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    localStorage.clear();
  });

  const click = (label) => act(() => {
    [...container.querySelectorAll("button")].find(button => button.textContent === label)
      .dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });

  test("keeps React counters and attributes synchronized in French", async () => {
    click("Increment");
    await act(async () => {});
    expect(container.querySelector('[data-testid="count"]').textContent).toBe("1");
    expect(container.querySelector("input").getAttribute("aria-label")).toBe("Valeur 1");
  });

  test("updates dynamic values while translating surrounding text", async () => {
    click("EN");
    await act(async () => {});
    expect(container.querySelector('[data-testid="sentence"]').textContent).toBe("conditions completed");
    click("Increment");
    await act(async () => {});
    expect(container.querySelector('[data-testid="count"]').textContent).toBe("1");
    click("FR");
    await act(async () => {});
    expect(container.querySelector('[data-testid="sentence"]').textContent).toBe("conditions validées");
    expect(container.querySelector('[data-testid="count"]').textContent).toBe("1");
  });
});
