export const TEMPLATE_STORAGE_KEY = "pipsevo.dashboard.templates.v1";

export const DEFAULT_DASHBOARD_TEMPLATES = [
  {
    id: "pipsevo",
    name: "PipsEvo essentiel",
    accent: "violet",
    builtIn: true,
    widgets: ["summary", "equity", "daily", "accounts"],
  },
  {
    id: "performance",
    name: "Performance",
    accent: "blue",
    builtIn: true,
    widgets: ["summary", "equity", "daily", "tradeTime", "tradeDuration"],
  },
  {
    id: "focus",
    name: "Focus discipline",
    accent: "violet",
    builtIn: true,
    widgets: ["summary", "equity", "accounts"],
  },
];

export function readDashboardTemplateState() {
  if (typeof window === "undefined") return { activeId: "pipsevo", custom: [] };
  try {
    const parsed = JSON.parse(window.localStorage.getItem(TEMPLATE_STORAGE_KEY));
    return {
      activeId: typeof parsed?.activeId === "string" ? parsed.activeId : "pipsevo",
      custom: Array.isArray(parsed?.custom) ? parsed.custom : [],
    };
  } catch {
    return { activeId: "pipsevo", custom: [] };
  }
}
