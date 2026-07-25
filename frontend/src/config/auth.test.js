import { AUTH_CONFIG, hasCompletedOnboarding } from "./auth";

describe("beta authentication configuration", () => {
  test("keeps email confirmation disabled by default during beta", () => {
    expect(AUTH_CONFIG.requireEmailConfirmation).toBe(false);
  });

  test("uses the canonical onboarding flag and supports the legacy alias", () => {
    expect(hasCompletedOnboarding({ onboarding_completed: true, onboarded: false })).toBe(true);
    expect(hasCompletedOnboarding({ onboarding_completed: false, onboarded: true })).toBe(false);
    expect(hasCompletedOnboarding({ onboarded: true })).toBe(true);
    expect(hasCompletedOnboarding(null)).toBe(false);
  });
});
