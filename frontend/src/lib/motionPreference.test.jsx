import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { getMotionPreference, isMotionReduced, MOTION_STORAGE_KEY, setMotionPreference, usePipsReducedMotion } from "./motionPreference";

describe("site motion preference", () => {
  let media;
  let mediaChange;
  beforeEach(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    localStorage.removeItem(MOTION_STORAGE_KEY);
    media = { matches: true, addEventListener: jest.fn((_, callback) => { mediaChange = callback; }), removeEventListener: jest.fn() };
    window.matchMedia = jest.fn(() => media);
  });
  afterEach(() => {
    localStorage.removeItem(MOTION_STORAGE_KEY);
    delete document.documentElement.dataset.motion;
    jest.restoreAllMocks();
  });

  test("respects the device by default and only enables full motion after an explicit choice", () => {
    expect(getMotionPreference()).toBe("system");
    expect(isMotionReduced()).toBe(true);
    setMotionPreference("full");
    expect(isMotionReduced()).toBe(false);
    expect(localStorage.getItem(MOTION_STORAGE_KEY)).toBe("full");
    expect(document.documentElement.dataset.motion).toBe("full");
    setMotionPreference("system");
    expect(isMotionReduced()).toBe(true);
  });

  test("keeps explicit reduced motion on devices that allow animations", () => {
    media.matches = false;
    setMotionPreference("reduced");
    expect(isMotionReduced()).toBe(true);
    setMotionPreference("unknown");
    expect(getMotionPreference()).toBe("reduced");
  });

  test("updates mounted consumers and CSS when the device setting changes", () => {
    const container = document.createElement("div");
    const root = createRoot(container);
    function Probe() { return <span>{usePipsReducedMotion() ? "reduced" : "full"}</span>; }
    act(() => root.render(<Probe />));
    expect(container.textContent).toBe("reduced");
    act(() => { media.matches = false; mediaChange(); });
    expect(container.textContent).toBe("full");
    expect(document.documentElement.dataset.motion).toBe("full");
    act(() => setMotionPreference("reduced"));
    expect(container.textContent).toBe("reduced");
    act(() => root.unmount());
    expect(media.removeEventListener).toHaveBeenCalled();
  });

  test("updates mounted consumers when another tab changes the preference", () => {
    const container = document.createElement("div");
    const root = createRoot(container);
    function Probe() { return <span>{usePipsReducedMotion() ? "reduced" : "full"}</span>; }
    act(() => root.render(<Probe />));
    act(() => {
      localStorage.setItem(MOTION_STORAGE_KEY, "full");
      window.dispatchEvent(new StorageEvent("storage", { key: MOTION_STORAGE_KEY }));
    });
    expect(container.textContent).toBe("full");
    act(() => root.unmount());
  });
});
