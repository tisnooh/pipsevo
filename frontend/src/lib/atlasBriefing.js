import { formatMoney } from "./preferences";

export const briefingPresentation = (alerts = []) => {
  if (alerts.some((item) => item.severity === "critical")) {
    return { label: "Priorité requise", color: "#F26A70", background: "rgba(242,106,112,.09)" };
  }
  if (alerts.some((item) => item.severity === "warning")) {
    return { label: "À consolider", color: "#FFB855", background: "rgba(255,184,85,.09)" };
  }
  return { label: "Aucune alerte mesurée", color: "#46C99A", background: "rgba(70,201,154,.09)" };
};

export const isAtlasBriefing = value => Boolean(value && typeof value === "object" && !Array.isArray(value)
  && value.overview && typeof value.overview === "object"
  && ["alerts", "action_plan", "review_queue"].every(key => Array.isArray(value[key]))
  && value.explainability?.data_quality && typeof value.explainability.data_quality === "object");

export const briefingPnl = (overview = {}) => {
  const validAmount = value => typeof value === "number" && Number.isFinite(value);
  const validCurrency = currency => /^[A-Z]{3}$/.test(currency || "") && currency !== "UNKNOWN";
  const amounts = overview.net_pnl_by_currency && typeof overview.net_pnl_by_currency === "object"
    ? Object.entries(overview.net_pnl_by_currency).filter(([currency, amount]) => validCurrency(currency) && validAmount(amount)).sort(([a], [b]) => a.localeCompare(b)) : [];
  if (amounts.length) return amounts.map(([currency, amount]) => formatMoney(amount, { currency, maximumFractionDigits: 2 })).join(" · ");
  if (!validAmount(overview.measured_pnl)) return "Non mesuré";
  return validCurrency(overview.currency) ? formatMoney(overview.measured_pnl, { currency: overview.currency, maximumFractionDigits: 2 }) : "Devise non renseignée";
};

export const actionPlanProgress = (actions = [], state = {}) => {
  const completed = actions.filter((action) => Boolean(state[action.id])).length;
  return {
    completed,
    total: actions.length,
    percent: actions.length ? Math.round((completed / actions.length) * 100) : 0,
  };
};

export const nextActionState = (state = {}, actionId) => ({
  ...state,
  [actionId]: !state[actionId],
});

export const measuredValue = (value, suffix = "") => (
  value === null || value === undefined ? "Non mesuré" : `${value}${suffix}`
);
