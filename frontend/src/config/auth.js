// Confirmation active par défaut. Elle ne peut être désactivée que de façon
// explicite pour un environnement local isolé.
const REQUIRE_EMAIL_CONFIRMATION = process.env.REACT_APP_REQUIRE_EMAIL_CONFIRMATION !== "false";

export const AUTH_CONFIG = Object.freeze({
  requireEmailConfirmation: REQUIRE_EMAIL_CONFIRMATION,
  contactEmail: process.env.REACT_APP_CONTACT_EMAIL || "support@pipsevo.com",
  postSignUpPath: "/onboarding",
  authenticatedHomePath: "/app/dashboard",
});

export const hasCompletedOnboarding = (user) =>
  Boolean(user?.onboarding_completed ?? user?.onboarded);
