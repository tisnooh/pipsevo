export const COMMERCIAL_PHASES = Object.freeze({
  BETA: "beta",
  LAUNCH_OFFER: "launch_offer",
  PAID: "paid",
});
export const BILLING_CONFIG = Object.freeze({
  currentPhase: COMMERCIAL_PHASES.BETA,
  betaEndDate: null,
  launchOfferEndDate: null,
  currency: "EUR",
  prices: Object.freeze({
    essential: 9.99,
    pro: 19.99,
    betaLaunch: 4.99,
  }),
});

export const PLANS = Object.freeze({
  beta: {
    id: "beta",
    name: "Bêta gratuite",
    price: 0,
  },
  essential: {
    id: "essential",
    name: "PipsEvo Essential",
    price: BILLING_CONFIG.prices.essential,
    description: "Pour les traders qui veulent structurer leur journal et protéger leurs comptes.",
    features: [
      "Jusqu’à 2 comptes prop firm",
      "Journal de trading manuel illimité",
      "Dashboard et statistiques essentielles",
      "Score de discipline",
      "Suivi des sessions, setups et émotions",
      "Objectifs et payouts manuels",
      "Captures d’écran",
      "Support standard",
    ],
  },
  pro: {
    id: "pro",
    name: "PipsEvo Pro",
    price: BILLING_CONFIG.prices.pro,
    description: "Pour les traders actifs qui gèrent plusieurs comptes et veulent des analyses avancées.",
    features: [
      "Tout ce qui est inclus dans Essential",
      "Plusieurs comptes prop firm",
      "Import CSV avancé",
      "Analyses et statistiques avancées",
      "Comparaison de comptes",
      "Rapports automatiques",
      "Coach IA et détection d’erreurs récurrentes",
      "Exports CSV et PDF",
      "Automatisations et support prioritaires",
    ],
  },
});

export const FEATURES = Object.freeze({
  dashboard: { beta: true, essential: true, pro: true },
  manualJournal: { beta: true, essential: true, pro: true },
  basicAnalytics: { beta: true, essential: true, pro: true },
  disciplineScore: { beta: true, essential: true, pro: true },
  manualPayouts: { beta: true, essential: true, pro: true },
  screenshots: { beta: true, essential: true, pro: true },
  multipleAccounts: { beta: false, essential: false, pro: true },
  csvImport: { beta: false, essential: false, pro: true },
  aiCoach: { beta: false, essential: false, pro: true },
  advancedAnalytics: { beta: false, essential: false, pro: true },
  automaticReports: { beta: false, essential: false, pro: true },
  advancedExports: { beta: false, essential: false, pro: true },
  premiumAutomations: { beta: false, essential: false, pro: true },
});

export const formatBillingPrice = (amount) => new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: BILLING_CONFIG.currency,
}).format(amount);

export const effectivePlan = (user) => {
  if (BILLING_CONFIG.currentPhase === COMMERCIAL_PHASES.BETA) return "beta";
  return user?.subscription_status === "active" || user?.subscription_status === "trialing"
    ? (user?.plan || "essential")
    : "beta";
};

export const hasPlanAccess = (plan, feature) => Boolean(FEATURES[feature]?.[plan]);
export const canUseFeature = (user, feature) => hasPlanAccess(effectivePlan(user), feature);

export const launchOfferCopy = () => ({
  title: `Passe à PipsEvo Pro pour seulement ${formatBillingPrice(BILLING_CONFIG.prices.betaLaunch)} le premier mois.`,
  detail: `Puis ${formatBillingPrice(BILLING_CONFIG.prices.pro)}/mois à partir du deuxième mois.`,
});
