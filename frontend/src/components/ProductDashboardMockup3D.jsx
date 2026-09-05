import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import ProductDashboardPreview from "@/components/ProductDashboardPreview";
import { Candle } from "@/components/CandleArt";

const CANDLES = [
  { color: "purple", height: 96, className: "product-mockup-candle candle-a" },
  { color: "green", height: 122, className: "product-mockup-candle candle-b" },
  { color: "pink", height: 105, className: "product-mockup-candle candle-c" },
  { color: "blue", height: 72, className: "product-mockup-candle candle-d" },
  { color: "green", height: 62, className: "product-mockup-candle candle-e" },
  { color: "purple", height: 54, className: "product-mockup-candle candle-f" },
  { color: "pink", height: 66, className: "product-mockup-candle candle-g" },
  { color: "blue", height: 48, className: "product-mockup-candle candle-h" },
];

export default function ProductDashboardMockup3D({ variant = "hero", activeSection = "overview", className = "" }) {
  const rootRef = useRef(null);
  const stageRef = useRef(null);
  const frameRef = useRef(null);
  const isPrimaryHeroMockup = variant === "hero" || variant === "mobile";

  useEffect(() => {
    const root = rootRef.current;
    const stage = stageRef.current;
    const frame = frameRef.current;
    if (!root || !stage || !frame) return undefined;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const desktopPointer = window.matchMedia("(min-width: 1024px) and (hover: hover) and (pointer: fine)").matches;
    const ambientTweens = [];
    const context = gsap.context(() => {
      if (!reducedMotion) {
        gsap.fromTo(
          frame,
          { autoAlpha: 0, x: isPrimaryHeroMockup ? 20 : 28, y: isPrimaryHeroMockup ? 12 : 18, scale: isPrimaryHeroMockup ? 1 : 0.985 },
          { autoAlpha: 1, x: 0, y: 0, scale: 1, duration: 0.52, ease: "power3.out" },
        );
      }

      if (reducedMotion) {
        gsap.set([frame, ...root.querySelectorAll(".product-mockup-candle"), root.querySelector(".product-mockup-floor-glow")], { clearProps: "transform,opacity,visibility" });
        return;
      }

      root.querySelectorAll(".product-mockup-candle").forEach((candle, index) => {
        const verticalDirection = index % 2 === 0 ? -1 : 1;
        const horizontalDirection = index % 3 === 0 ? 1 : -1;
        ambientTweens.push(gsap.to(candle, {
          x: horizontalDirection * (8 + (index % 3) * 4),
          y: verticalDirection * (22 + (index % 4) * 6),
          duration: 2.05 + index * 0.18,
          delay: index * 0.11,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        }));
      });
      ambientTweens.push(gsap.to(root.querySelector(".product-mockup-floor-glow"), {
        opacity: isPrimaryHeroMockup ? 0.34 : 0.86,
        scaleX: isPrimaryHeroMockup ? 1.04 : 1.08,
        duration: 3.8,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      }));
    }, root);

    if (reducedMotion) return () => context.revert();

    const syncAmbientMotion = (isVisible) => ambientTweens.forEach((tween) => tween.paused(!isVisible || document.hidden));
    const observer = new IntersectionObserver(([entry]) => syncAmbientMotion(entry.isIntersecting), { rootMargin: "140px" });
    const handleVisibility = () => syncAmbientMotion(root.getBoundingClientRect().bottom > -140 && root.getBoundingClientRect().top < window.innerHeight + 140);
    observer.observe(root);
    document.addEventListener("visibilitychange", handleVisibility);

    const cleanupMotion = () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", handleVisibility);
      context.revert();
    };

    if (!desktopPointer || reducedMotion || variant !== "hero") return cleanupMotion;

    const moveX = gsap.quickTo(stage, "x", { duration: 0.28, ease: "power3.out" });
    const moveY = gsap.quickTo(stage, "y", { duration: 0.28, ease: "power3.out" });

    const handlePointerMove = (event) => {
      const bounds = root.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width - 0.5;
      const y = (event.clientY - bounds.top) / bounds.height - 0.5;
      moveX(x * 5);
      moveY(y * 4);
    };
    const reset = () => { moveX(0); moveY(0); };
    root.addEventListener("pointermove", handlePointerMove, { passive: true });
    root.addEventListener("pointerleave", reset);
    return () => {
      root.removeEventListener("pointermove", handlePointerMove);
      root.removeEventListener("pointerleave", reset);
      cleanupMotion();
    };
  }, [isPrimaryHeroMockup, variant]);

  return (
    <div ref={rootRef} className={`product-dashboard-mockup product-dashboard-mockup--${variant} ${className}`}>
      <div className="product-mockup-floor-glow" aria-hidden="true" />
      <div ref={stageRef} className="product-mockup-stage">
        {!isPrimaryHeroMockup && <div className="product-mockup-depth product-mockup-depth--far" aria-hidden="true" />}
        <div className="product-mockup-depth product-mockup-depth--near" aria-hidden="true" />
        <div ref={frameRef} className="product-mockup-frame">
          <div className="product-mockup-edge" aria-hidden="true" />
          <ProductDashboardPreview variant={variant === "hero" ? "hero" : variant} activeSection={activeSection} />
        </div>
      </div>
      {variant === "hero" && CANDLES.map((candle) => <Candle key={candle.className} {...candle} />)}
    </div>
  );
}
