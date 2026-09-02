import { readDashboardTemplateState, TEMPLATE_STORAGE_KEY } from "../../lib/dashboardTemplates";

describe("DashboardTemplateManager preferences", () => {
  beforeEach(() => window.localStorage.clear());

  test("utilise le template PipsEvo par défaut", () => {
    expect(readDashboardTemplateState()).toEqual({ activeId: "pipsevo", custom: [] });
  });

  test("restaure le template personnalisé actif", () => {
    const custom = [{ id: "custom-1", name: "Mon suivi", accent: "blue", widgets: ["summary"] }];
    window.localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify({ activeId: "custom-1", custom }));
    expect(readDashboardTemplateState()).toEqual({ activeId: "custom-1", custom });
  });

  test("ignore une préférence locale invalide", () => {
    window.localStorage.setItem(TEMPLATE_STORAGE_KEY, "{incorrect");
    expect(readDashboardTemplateState()).toEqual({ activeId: "pipsevo", custom: [] });
  });
});
