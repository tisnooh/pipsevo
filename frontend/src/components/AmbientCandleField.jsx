import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { Candle } from "@/components/CandleArt";

const CANDLES = [
  { x: 43, y: 1.4, mobileX: 4, mobileY: 2.2, color: "purple", height: 58, scale: .52, opacity: .58, driftX: 42, driftY: 76, duration: 5.8, mobile: true },
  { x: 79, y: 1.8, mobileX: 94, mobileY: 3.6, color: "green", height: 78, scale: .62, opacity: .64, driftX: -52, driftY: 92, duration: 7.2, mobile: true },
  { x: 95, y: 4.8, color: "pink", height: 48, scale: .42, opacity: .48, driftX: -34, driftY: -66, duration: 6.5 },
  { x: 34, y: 5.7, color: "blue", height: 66, scale: .48, opacity: .50, driftX: 62, driftY: -84, duration: 7.8 },
  { x: 4, y: 4.1, mobileX: 7, mobileY: 7.2, color: "purple", height: 52, scale: .38, opacity: .46, driftX: 46, driftY: 72, duration: 5.4, mobile: true },
  { x: 67, y: 3.1, color: "green", height: 72, scale: .56, opacity: .60, driftX: -70, driftY: 108, duration: 8.4 },
  { x: 3, y: 22.4, color: "pink", height: 44, scale: .36, opacity: .38, driftX: 50, driftY: 64, duration: 6.1 },
  { x: 53, y: 26.5, color: "blue", height: 58, scale: .44, opacity: .42, driftX: 38, driftY: -98, duration: 7.5, mobile: true },
  { x: 92, y: 30.2, color: "green", height: 88, scale: .64, opacity: .58, driftX: -58, driftY: -112, duration: 8.8 },
  { x: 13, y: 33.8, color: "purple", height: 62, scale: .47, opacity: .50, driftX: 68, driftY: 86, duration: 6.9 },
  { x: 72, y: 37.2, color: "pink", height: 50, scale: .40, opacity: .45, driftX: -36, driftY: 78, duration: 5.7, mobile: true },
  { x: 2, y: 41.4, color: "green", height: 76, scale: .58, opacity: .55, driftX: 54, driftY: -106, duration: 8.1 },
  { x: 96, y: 45.5, color: "blue", height: 54, scale: .40, opacity: .42, driftX: -64, driftY: 72, duration: 6.6 },
  { x: 36, y: 49.2, color: "purple", height: 46, scale: .35, opacity: .36, driftX: 44, driftY: -62, duration: 5.5 },
  { x: 83, y: 52.8, color: "green", height: 82, scale: .60, opacity: .58, driftX: -52, driftY: -118, duration: 8.7, mobile: true },
  { x: 7, y: 56.8, color: "pink", height: 60, scale: .46, opacity: .47, driftX: 72, driftY: 92, duration: 7.4 },
  { x: 62, y: 60.6, color: "blue", height: 48, scale: .37, opacity: .38, driftX: -42, driftY: 74, duration: 5.9 },
  { x: 94, y: 64.4, color: "purple", height: 68, scale: .50, opacity: .50, driftX: -66, driftY: -96, duration: 7.9 },
  { x: 18, y: 68.2, color: "green", height: 74, scale: .55, opacity: .53, driftX: 56, driftY: -108, duration: 8.3, mobile: true },
  { x: 76, y: 71.9, color: "pink", height: 52, scale: .41, opacity: .44, driftX: 38, driftY: 82, duration: 6.3 },
  { x: 3, y: 75.8, color: "blue", height: 64, scale: .48, opacity: .48, driftX: 62, driftY: 94, duration: 7.6 },
  { x: 89, y: 79.6, color: "green", height: 86, scale: .63, opacity: .59, driftX: -74, driftY: 122, duration: 9.1, mobile: true },
  { x: 48, y: 83.1, color: "purple", height: 44, scale: .34, opacity: .34, driftX: 46, driftY: -68, duration: 5.6 },
  { x: 12, y: 86.6, color: "pink", height: 56, scale: .43, opacity: .45, driftX: 58, driftY: -84, duration: 6.8 },
  { x: 96, y: 89.7, color: "blue", height: 70, scale: .52, opacity: .49, driftX: -68, driftY: -104, duration: 8.0 },
  { x: 67, y: 92.8, color: "green", height: 62, scale: .47, opacity: .50, driftX: -44, driftY: 86, duration: 7.1, mobile: true },
  { x: 27, y: 95.6, color: "purple", height: 52, scale: .39, opacity: .41, driftX: 52, driftY: -74, duration: 6.2 },
];

export default function AmbientCandleField() {
  const fieldRef = useRef(null);

  useEffect(() => {
    const field = fieldRef.current;
    if (!field) return undefined;

    const media = gsap.matchMedia();
    media.add(
      {
        reducedMotion: "(prefers-reduced-motion: reduce)",
        mobile: "(max-width: 767px)",
        desktop: "(min-width: 768px)",
      },
      ({ conditions }) => {
        const candles = gsap.utils.toArray("[data-ambient-candle]", field)
          .filter((candle) => !conditions.mobile || candle.dataset.mobile === "true");

        if (conditions.reducedMotion) {
          gsap.set(candles, { autoAlpha: (_, candle) => Number(candle.dataset.opacity) * .72 });
          return undefined;
        }

        const tweens = new Map();
        candles.forEach((candle, index) => {
          const direction = index % 2 === 0 ? 1 : -1;
          gsap.set(candle, {
            x: direction * -10,
            y: direction * 14,
            rotation: direction * -2,
            autoAlpha: Number(candle.dataset.opacity) * .72,
          });
          const tween = gsap.to(candle, {
            x: Number(candle.dataset.driftX),
            y: Number(candle.dataset.driftY),
            rotation: direction * (4 + (index % 4) * 1.2),
            autoAlpha: Number(candle.dataset.opacity),
            duration: Number(candle.dataset.duration),
            delay: (index % 7) * .18,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut",
            paused: true,
          });
          tweens.set(candle, tween);
        });

        const observer = new IntersectionObserver((entries) => {
          entries.forEach((entry) => tweens.get(entry.target)?.paused(!entry.isIntersecting || document.hidden));
        }, { rootMargin: "220px 0px" });

        candles.forEach((candle) => observer.observe(candle));
        const onVisibilityChange = () => {
          candles.forEach((candle) => {
            const bounds = candle.getBoundingClientRect();
            const nearViewport = bounds.bottom > -220 && bounds.top < window.innerHeight + 220;
            tweens.get(candle)?.paused(document.hidden || !nearViewport);
          });
        };
        document.addEventListener("visibilitychange", onVisibilityChange);
        onVisibilityChange();

        return () => {
          observer.disconnect();
          document.removeEventListener("visibilitychange", onVisibilityChange);
          tweens.forEach((tween) => tween.kill());
        };
      },
    );

    return () => media.revert();
  }, []);

  return (
    <div ref={fieldRef} className="ambient-candle-field" aria-hidden="true">
      {CANDLES.map((candle, index) => (
        <span
          key={`${candle.x}-${candle.y}-${candle.color}`}
          data-ambient-candle
          data-mobile={candle.mobile ? "true" : "false"}
          data-opacity={candle.opacity}
          data-drift-x={candle.driftX}
          data-drift-y={candle.driftY}
          data-duration={candle.duration}
          className="ambient-candle"
          style={{
            left: `${candle.x}%`,
            top: `${candle.y}%`,
            "--ambient-scale": candle.scale,
            "--ambient-mobile-left": `${candle.mobileX ?? candle.x}%`,
            "--ambient-mobile-top": `${candle.mobileY ?? candle.y}%`,
          }}
        >
          <Candle color={candle.color} height={candle.height} className="ambient-candle__shape" rot={(index % 5) - 2} />
        </span>
      ))}
    </div>
  );
}
