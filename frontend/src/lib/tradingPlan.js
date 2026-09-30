export const TRADING_PLAN_FIELDS = [
  "title", "mission", "markets", "sessions", "setup_definition", "entry_rules",
  "exit_rules", "risk_management", "forbidden_conditions", "review_process", "notes",
];

export const TRADING_PLAN_SECTION_MAX_LENGTH = 5000;

export const createDefaultTradingPlan = () => ({
  title: "Mon plan de trading",
  mission: "",
  markets: "",
  sessions: "",
  setup_definition: "",
  entry_rules: "",
  exit_rules: "",
  risk_management: "",
  forbidden_conditions: "",
  review_process: "",
  notes: "",
});

export const normalizeTradingPlan = (value = {}) => {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return Object.fromEntries(TRADING_PLAN_FIELDS.map((field) => [
    field,
    typeof source[field] === "string" ? source[field].slice(0, field === "title" ? 120 : TRADING_PLAN_SECTION_MAX_LENGTH) : createDefaultTradingPlan()[field],
  ]));
};

export const hasTradingPlanContent = (value) => {
  const plan = normalizeTradingPlan(value);
  return TRADING_PLAN_FIELDS.some((field) => field !== "title" && plan[field].trim().length > 0);
};
