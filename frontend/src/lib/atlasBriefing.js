export const briefingPresentation = (alerts = []) => {
  if (alerts.some((item) => item.severity === "critical")) {
    return { label: "Priorité requise", color: "#F26A70", background: "rgba(242,106,112,.09)" };
  }
  if (alerts.some((item) => item.severity === "warning")) {
    return { label: "À consolider", color: "#FFB855", background: "rgba(255,184,85,.09)" };
  }
  return { label: "Processus stable", color: "#46C99A", background: "rgba(70,201,154,.09)" };
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
