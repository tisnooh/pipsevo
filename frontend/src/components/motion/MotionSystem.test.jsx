import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { MotionScope } from "./MotionSystem";

describe("MotionScope", () => {
  let container;
  let root;
  let intersectionCallback;

  beforeEach(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    window.matchMedia = jest.fn().mockReturnValue({
      matches: false,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    });
    global.IntersectionObserver = class IntersectionObserverMock {
      constructor(callback) { intersectionCallback = callback; }
      observe = jest.fn();
      unobserve = jest.fn();
      disconnect = jest.fn();
    };
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    jest.restoreAllMocks();
  });

  test("reveals the first visual layer when it enters the viewport", () => {
    act(() => root.render(
      <MotionScope>
        <header className="pe-page-header">Header</header>
        <article className="pe-card"><div className="card-elev">Nested card</div></article>
      </MotionScope>,
    ));

    const header = container.querySelector(".pe-page-header");
    const card = container.querySelector(".pe-card");
    const nestedCard = container.querySelector(".card-elev");
    expect(header.classList.contains("pe-motion-item")).toBe(true);
    expect(card.classList.contains("pe-motion-item")).toBe(true);
    expect(card.classList.contains("pe-motion-surface")).toBe(true);
    expect(nestedCard.classList.contains("pe-motion-item")).toBe(false);

    act(() => intersectionCallback([
      { target: header, isIntersecting: true },
      { target: card, isIntersecting: true },
    ]));
    expect(header.classList.contains("pe-motion-visible")).toBe(true);
    expect(card.classList.contains("pe-motion-visible")).toBe(true);
  });

  test("shows content immediately when reduced motion is requested", () => {
    window.matchMedia.mockReturnValue({
      matches: true,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    });

    act(() => root.render(<MotionScope><div data-motion-item>Static content</div></MotionScope>));
    expect(container.querySelector("[data-motion-item]").classList.contains("pe-motion-visible")).toBe(true);
  });
});
