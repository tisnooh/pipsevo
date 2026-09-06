import React, { act } from "react";
import { createRoot } from "react-dom/client";
import RouteScrollManager from "./RouteScrollManager";

let mockLocation = { pathname: "/pricing", hash: "" };

jest.mock("react-router-dom", () => ({
  useLocation: () => mockLocation,
}), { virtual: true });

describe("RouteScrollManager", () => {
  let container;
  let root;

  beforeEach(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    mockLocation = { pathname: "/pricing", hash: "" };
    window.scrollTo = jest.fn();
    window.requestAnimationFrame = jest.fn(callback => {
      callback();
      return 1;
    });
    window.cancelAnimationFrame = jest.fn();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    jest.clearAllMocks();
  });

  test("replace le document en haut au chargement et à chaque changement de page", () => {
    act(() => {
      root.render(<RouteScrollManager />);
    });

    expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 0, left: 0, behavior: "auto" });
    window.scrollTo.mockClear();

    mockLocation = { pathname: "/faq", hash: "" };
    act(() => root.render(<RouteScrollManager />));

    expect(window.scrollTo).toHaveBeenCalledTimes(3);
    expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 0, left: 0, behavior: "auto" });
  });

  test("laisse les liens avec ancre atteindre leur section", () => {
    act(() => {
      root.render(<RouteScrollManager />);
    });
    window.scrollTo.mockClear();

    mockLocation = { pathname: "/", hash: "#fonctionnalites" };
    act(() => root.render(<RouteScrollManager />));

    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  test("corrige aussi la restauration de scroll du cache mobile", () => {
    act(() => root.render(<RouteScrollManager />));
    window.scrollTo.mockClear();

    act(() => window.dispatchEvent(new Event("pageshow")));

    expect(window.scrollTo).toHaveBeenCalledTimes(1);
    expect(document.documentElement.scrollTop).toBe(0);
    expect(document.body.scrollTop).toBe(0);
  });
});
