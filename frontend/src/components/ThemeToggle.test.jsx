import React, { act } from "react";
import { createRoot } from "react-dom/client";
import ThemeToggle from "./ThemeToggle";

const mockSetTheme = jest.fn();
let mockResolvedTheme = "dark";

jest.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: mockResolvedTheme, setTheme: mockSetTheme }),
}));

describe("ThemeToggle", () => {
  let container;
  let root;

  beforeEach(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    mockResolvedTheme = "dark";
    mockSetTheme.mockClear();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  test("switches from dark to light with an accessible label", () => {
    act(() => root.render(<ThemeToggle />));
    const button = container.querySelector("button");
    expect(button.getAttribute("aria-label")).toBe("Activer le mode clair");
    act(() => button.click());
    expect(mockSetTheme).toHaveBeenCalledWith("light");
  });

  test("switches from light to dark", () => {
    mockResolvedTheme = "light";
    act(() => root.render(<ThemeToggle />));
    const button = container.querySelector("button");
    expect(button.getAttribute("aria-label")).toBe("Activer le mode sombre");
    act(() => button.click());
    expect(mockSetTheme).toHaveBeenCalledWith("dark");
  });
});
