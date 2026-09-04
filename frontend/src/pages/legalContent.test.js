jest.mock("react-router-dom", () => ({ Link: () => null, useParams: () => ({}) }), { virtual: true });
jest.mock("@/components/PublicHeader", () => () => null, { virtual: true });
jest.mock("@/components/PublicFooter", () => () => null, { virtual: true });
jest.mock("@/lib/api", () => ({ contact: jest.fn() }), { virtual: true });
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }), { virtual: true });
jest.mock("@/components/CookieConsent", () => ({ openCookieSettings: jest.fn() }), { virtual: true });
jest.mock("@/config/billing", () => ({ BILLING_CONFIG: {}, COMMERCIAL_PHASES: {}, PLANS: {}, PRICING_COMPARISON: [], formatBillingPrice: jest.fn(), launchOfferCopy: jest.fn() }), { virtual: true });
jest.mock("@/lib/commercialAnalytics", () => ({ captureCommercialEvent: jest.fn() }), { virtual: true });
jest.mock("@/context/AuthContext", () => ({ useAuth: () => ({ user: null }) }), { virtual: true });
jest.mock("@/context/I18nContext", () => ({ useI18n: () => ({ language: "fr", t: (fr) => fr }) }), { virtual: true });
jest.mock("@/content/guides", () => ({ getGuideBySlug: jest.fn(), guides: [] }), { virtual: true });

import { legal } from "./SupportPages";

describe("public legal content", () => {
  test("covers every public legal route with substantive sections", () => {
    ["privacy", "terms", "notice", "cookies", "data", "security"].forEach((key) => {
      expect(legal[key].title).toBeTruthy();
      expect(legal[key].intro).toBeTruthy();
      expect(legal[key].sections.length).toBeGreaterThanOrEqual(4);
    });
  });

  test("does not invent unknown publisher details", () => {
    expect(JSON.stringify(legal.notice)).toContain("À RENSEIGNER");
    expect(JSON.stringify(legal.privacy)).toContain("À RENSEIGNER");
  });

  test("documents the processors actually configured in the repository", () => {
    const privacy = JSON.stringify(legal.privacy);
    ["Supabase", "MongoDB Atlas", "Vercel", "Render", "Resend", "Anthropic", "MetaApi", "PostHog"].forEach((provider) => expect(privacy).toContain(provider));
  });
});
