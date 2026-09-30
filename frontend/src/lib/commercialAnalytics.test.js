import { captureCommercialEvent } from "./commercialAnalytics";
import { saveCookieConsent } from "./cookieConsent";

describe("commercial analytics consent", () => {
  beforeEach(() => {
    localStorage.clear();
    window.posthog = { capture: jest.fn() };
  });

  afterEach(() => {
    delete window.posthog;
  });

  test("does not capture a product event before consent", () => {
    captureCommercialEvent("pricing_cta_clicked", { plan: "pro" });
    expect(window.posthog.capture).not.toHaveBeenCalled();
  });

  test("captures an explicitly coded event after analytics consent", () => {
    saveCookieConsent(true);
    captureCommercialEvent("pricing_cta_clicked", { plan: "pro" });
    expect(window.posthog.capture).toHaveBeenCalledWith("pricing_cta_clicked", { plan: "pro" });
  });
});
