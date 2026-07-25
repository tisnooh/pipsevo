// OFF pendant la bêta.
// À réactiver pour le lancement officiel.
const REQUIRE_EMAIL_CONFIRMATION = process.env.REACT_APP_REQUIRE_EMAIL_CONFIRMATION === "true";

export const AUTH_CONFIG = Object.freeze({
  requireEmailConfirmation: REQUIRE_EMAIL_CONFIRMATION,
  contactEmail: "tyachatfr@gmail.com",
  postSignUpPath: "/onboarding",
  authenticatedHomePath: "/app/dashboard",
});

export const hasCompletedOnboarding = (user) =>
  Boolean(user?.onboarding_completed ?? user?.onboarded);
