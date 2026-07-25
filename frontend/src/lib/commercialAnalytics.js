export function captureCommercialEvent(event, properties = {}) {
  if (typeof window === "undefined") return;
  window.posthog?.capture?.(event, properties);
}
