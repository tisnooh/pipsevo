import React, { useLayoutEffect, useRef } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { usePipsReducedMotion as useReducedMotion } from "../../lib/motionPreference";

const EASE_OUT = [0.22, 1, 0.36, 1];
const REVEAL_SELECTOR = [
  "[data-motion-item]",
  ".pe-page-header",
  ".pe-card",
  ".pe-table-shell",
  ".pe-empty-state",
  ".card-elev",
].join(",");

/**
 * Apply the same resolved site/device preference to Framer Motion and the
 * authored components below, including changes made while the page is open.
 */
export function MotionProvider({ children }) {
  const reducedMotion = useReducedMotion();
  return (
    <MotionConfig reducedMotion={reducedMotion ? "always" : "never"} transition={{ duration: 0.48, ease: EASE_OUT }}>
      {children}
    </MotionConfig>
  );
}

/**
 * Progressive enhancement for existing screens. It reveals the first visual
 * layer of a page and any cards added after an API response, without changing
 * the structure or remounting routed content.
 */
export function MotionScope({ children, className = "", routeKey = "", as = "div", ...props }) {
  const scopeRef = useRef(null);
  const reducedMotion = useReducedMotion();
  const Component = as;

  useLayoutEffect(() => {
    const root = scopeRef.current;
    if (!root) return undefined;

    const processed = new Set();
    const groupedIndexes = new Map();
    const frameIds = new Set();
    const observer = !reducedMotion && "IntersectionObserver" in window
      ? new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("pe-motion-visible");
          observer.unobserve(entry.target);
        });
      }, { threshold: 0.06, rootMargin: "0px 0px -6% 0px" })
      : null;

    const reveal = (node) => node.classList.add("pe-motion-visible");

    const isFirstVisualLayer = (node) => {
      if (!(node instanceof HTMLElement) || node.closest("[data-motion-skip]")) return false;
      const animatedAncestor = node.parentElement?.closest(REVEAL_SELECTOR);
      return !animatedAncestor || !root.contains(animatedAncestor);
    };

    const prepare = (node) => {
      if (!isFirstVisualLayer(node) || processed.has(node)) return;
      processed.add(node);
      node.classList.add("pe-motion-item");
      if (node.matches(".pe-card, .card-elev, [data-motion-surface]")) {
        node.classList.add("pe-motion-surface");
      }

      const parent = node.parentElement;
      const index = groupedIndexes.get(parent) || 0;
      groupedIndexes.set(parent, index + 1);
      node.style.setProperty("--pe-motion-delay", `${Math.min(index, 6) * 55}ms`);

      if (reducedMotion || !observer) {
        reveal(node);
        return;
      }

      const bounds = node.getBoundingClientRect();
      const alreadyInView = bounds.bottom > 0 && bounds.top < window.innerHeight * 0.94;
      if (alreadyInView) {
        const frameId = window.requestAnimationFrame(() => {
          frameIds.delete(frameId);
          reveal(node);
        });
        frameIds.add(frameId);
      } else {
        observer.observe(node);
      }
    };

    const scan = (container) => {
      if (container instanceof HTMLElement && container.matches(REVEAL_SELECTOR)) prepare(container);
      container.querySelectorAll?.(REVEAL_SELECTOR).forEach(prepare);
    };

    scan(root);
    const mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) scan(node);
      }));
    });
    mutationObserver.observe(root, { childList: true, subtree: true });

    return () => {
      mutationObserver.disconnect();
      observer?.disconnect();
      frameIds.forEach((frameId) => window.cancelAnimationFrame(frameId));
      processed.forEach((node) => {
        node.classList.remove("pe-motion-item", "pe-motion-visible", "pe-motion-surface");
        node.style.removeProperty("--pe-motion-delay");
      });
    };
  }, [routeKey, reducedMotion]);

  return <Component ref={scopeRef} className={`pe-motion-scope ${className}`.trim()} {...props}>{children}</Component>;
}

export function FadeIn({ children, className = "", delay = 0, amount = 0.08 }) {
  const reducedMotion = useReducedMotion();
  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount, margin: "0px 0px -6% 0px" }}
      transition={reducedMotion ? { duration: 0 } : { duration: 0.48, delay, ease: EASE_OUT }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function Presence({ show, children }) {
  if (process.env.NODE_ENV === "test") return show ? children : null;
  return <AnimatePresence initial={false}>{show ? children : null}</AnimatePresence>;
}

export const MotionOverlay = React.forwardRef(function MotionOverlay({ children, className = "", ...props }, ref) {
  const reducedMotion = useReducedMotion();
  return (
    <motion.div
      ref={ref}
      initial={reducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reducedMotion ? 0 : 0.16, ease: "easeOut" }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
});

export const MotionPopover = React.forwardRef(function MotionPopover({ children, className = "", ...props }, ref) {
  const reducedMotion = useReducedMotion();
  return (
    <motion.div
      ref={ref}
      initial={reducedMotion ? false : { opacity: 0, y: -6, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.99 }}
      transition={{ duration: reducedMotion ? 0 : 0.18, ease: EASE_OUT }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
});
