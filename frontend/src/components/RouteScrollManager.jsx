import { useEffect, useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

export function scrollToDocumentTop() {
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });

  if (document.scrollingElement) document.scrollingElement.scrollTop = 0;
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

export default function RouteScrollManager() {
  const { hash, pathname } = useLocation();

  useLayoutEffect(() => {
    if (hash) return undefined;

    let secondFrame;
    scrollToDocumentTop();

    const firstFrame = window.requestAnimationFrame(() => {
      scrollToDocumentTop();
      secondFrame = window.requestAnimationFrame(scrollToDocumentTop);
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      if (secondFrame) window.cancelAnimationFrame(secondFrame);
    };
  }, [hash, pathname]);

  useEffect(() => {
    if (hash) return undefined;

    const handlePageShow = () => scrollToDocumentTop();
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, [hash]);

  return null;
}
