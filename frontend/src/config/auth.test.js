import { AUTH_CONFIG, hasCompletedOnboarding } from "./auth";

describe("authentication configuration", () => {
  test("requires email confirmation by default", () => {
    expect(AUTH_CONFIG.requireEmailConfirmation).toBe(true);
  });

  test("uses the canonical onboarding flag and supports the legacy alias", () => {
    expect(hasCompletedOnboarding({ onboarding_completed: true, onboarded: false })).toBe(true);
    expect(hasCompletedOnboarding({ onboarding_completed: false, onboarded: true })).toBe(false);
    expect(hasCompletedOnboarding({ onboarded: true })).toBe(true);
    expect(hasCompletedOnboarding(null)).toBe(false);
  });
});
