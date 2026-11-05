import React, { act } from "react";
import { createRoot } from "react-dom/client";
import AICoach from "./AICoach";
import { accounts, auth, coach, dashboard } from "@/lib/api";
import { toast } from "sonner";

let mockUser;
const mockSetUser = jest.fn();
jest.mock("@/context/AuthContext", () => ({ useAuth: () => ({ user: mockUser, setUser: mockSetUser }) }));
jest.mock("@/context/I18nContext", () => ({ useI18n: () => ({ language: "fr" }) }));
jest.mock("@/hooks/useAppSettings", () => ({ useAppSettings: () => ({ date: value => value, money: value => String(value) }) }));
jest.mock("@/lib/api", () => ({ accounts: { list: jest.fn() }, auth: { update: jest.fn() }, coach: { history: jest.fn(), briefing: jest.fn(), ask: jest.fn() }, dashboard: jest.fn() }));
jest.mock("@/config/billing", () => ({ canUseFeature: () => true }));
jest.mock("@/components/FeatureGate", () => ({ FeatureGate: ({ children }) => children }));
jest.mock("@/components/AtlasReadiness", () => () => null);
jest.mock("@/components/AtlasCoachingHub", () => ({ briefing, loading, onPeriodChange, onToggleAction }) => <div><span data-testid="briefing-current">{loading ? "loading" : briefing?.marker || "none"}</span><button onClick={() => onPeriodChange("daily")}>Jour</button><button onClick={() => onToggleAction("daily:test")}>Action</button></div>);
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

let container, root;
const briefing = marker => ({ marker, overview: {}, alerts: [], action_plan: [], review_queue: [], explainability: { data_quality: {} } });
beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container);
  mockUser = { id: "A", name: "A", app_preferences: {} };
  accounts.list.mockReset().mockResolvedValue({ data: [] });
  dashboard.mockReset().mockResolvedValue({ data: { kpis: { total_trades: 0 } } });
  coach.history.mockReset().mockResolvedValue({ data: [] });
  coach.briefing.mockReset().mockResolvedValue({ data: briefing("semaine") });
  coach.ask.mockReset().mockResolvedValue({ data: { id: "report", question: "Question", answer: "Réponse actuelle", model: "deterministic-coaching-v1" } });
  auth.update.mockReset(); mockSetUser.mockReset();
  Element.prototype.scrollIntoView = jest.fn();
});
afterEach(() => { act(() => root.unmount()); container.remove(); });
const render = async () => act(async () => root.render(<AICoach />));
const ask = async () => {
  await act(async () => {
    const input = container.querySelector('[data-testid="coach-input"]');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(input, "Relis mon processus");
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await act(async () => container.querySelector('[data-testid="coach-ask"]').click());
};

test("une réponse réelle est affichée avec l’origine locale du moteur", async () => {
  await render(); await ask();
  expect(container.textContent).toContain("Réponse actuelle");
  expect(container.textContent).toContain("Analyse locale par règles");
  expect(toast.success).toHaveBeenCalledWith("Analyse prête");
});

test("un échec de changement de période ne conserve pas le bilan de l’ancienne période", async () => {
  await render();
  expect(container.querySelector('[data-testid="briefing-current"]').textContent).toBe("semaine");
  coach.briefing.mockRejectedValue(new Error("network"));
  await act(async () => [...container.querySelectorAll("button")].find(button => button.textContent === "Jour").click());
  expect(container.querySelector('[data-testid="briefing-current"]').textContent).toBe("none");
  expect(container.textContent).toContain("les données manquantes ne sont pas validées");
});

test("un historique ou bilan malformé est refusé sans planter le rendu", async () => {
  coach.history.mockResolvedValue({ data: {} });
  coach.briefing.mockResolvedValue({ data: { overview: {} } });
  await render();
  expect(container.textContent).toContain("les données manquantes ne sont pas validées");
  expect(container.querySelector('[data-testid="briefing-current"]').textContent).toBe("none");
});

test("une réponse d’analyse ancienne ne traverse pas un changement de compte", async () => {
  let finish;
  coach.ask.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  await render(); await ask();
  mockUser = { id: "B", name: "B", app_preferences: {} };
  await render();
  await act(async () => finish({ data: { id: "old", answer: "Rapport privé A" } }));
  expect(container.textContent).not.toContain("Rapport privé A");
  expect(toast.success).not.toHaveBeenCalled();
  await ask(); expect(coach.ask).toHaveBeenCalledTimes(2);
});

test("un retour d’analyse malformé n’annonce jamais un succès", async () => {
  coach.ask.mockResolvedValue({ data: { id: "bad" } });
  await render(); await ask();
  expect(toast.success).not.toHaveBeenCalled();
  expect(container.textContent).toContain("Atlas ne répond pas pour le moment");
});

test("la fin d’une sauvegarde d’action ne modifie pas le profil du compte suivant", async () => {
  let finish;
  auth.update.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  await render();
  await act(async () => [...container.querySelectorAll("button")].find(button => button.textContent === "Action").click());
  mockUser = { id: "B", name: "B", app_preferences: {} };
  await render();
  await act(async () => finish({ data: { id: "A", app_preferences: {} } }));
  expect(mockSetUser).not.toHaveBeenCalled();
});
