import { hasAnalyticsConsent } from "./cookieConsent";
import { canLoadAnalytics } from "./authUrlPrivacy";

export function captureCommercialEvent(event, properties = {}) {
  if (typeof window === "undefined" || !hasAnalyticsConsent() || !canLoadAnalytics(window.location)) return;
  window.posthog?.capture?.(event, properties);
}
