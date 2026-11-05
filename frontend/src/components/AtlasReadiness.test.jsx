import React, { act } from "react";
import { createRoot } from "react-dom/client";
import AtlasReadiness from "./AtlasReadiness";
import { coach } from "@/lib/api";
import { toast } from "sonner";

jest.mock("@/lib/api", () => ({ coach: { readiness: jest.fn() } }));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
let root, container, user, accounts;
const ready = { status: "ready", score: 100, checks: [], summary: "Contrôle de la proposition", disclaimer: "Pas de signal" };
beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container);
  user = { id: "A", rules: { pre_trade_checklist: [{ id: "risk", label: "Risque calculé", required: true }] } };
  accounts = [{ id: "account-a", name: "A", status: "active", balance: 50000 }];
  coach.readiness.mockReset().mockResolvedValue({ data: ready });
});
afterEach(() => { act(() => root.unmount()); container.remove(); });
const render = async () => act(async () => root.render(<AtlasReadiness accounts={accounts} user={user} />));
const validate = async () => act(async () => [...container.querySelectorAll("button")].find(button => button.textContent === "Contrôler mon processus").click());
const inputFor = label => [...container.querySelectorAll("label")].find(item => item.textContent.startsWith(label)).querySelector("input");
const setInput = async (input, value) => act(async () => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
});

test("modifier la proposition invalide immédiatement l’ancien résultat vert", async () => {
  await render(); await validate();
  expect(container.textContent).toContain("Processus validé");
  await setInput(inputFor("Risque prévu"), "5");
  expect(container.textContent).not.toContain("Processus validé");
  expect(container.textContent).toContain("Proposition non vérifiée");
});

test("un changement de compte ou de règle invalide aussi le contrôle", async () => {
  await render(); await validate();
  accounts = [{ ...accounts[0], balance: 45000 }];
  await render(); expect(container.textContent).not.toContain("Processus validé");
  await validate();
  user = { ...user, rules: { ...user.rules, daily_loss_limit: 10 } };
  await render(); expect(container.textContent).not.toContain("Processus validé");
});

test("une réponse de contrôle ancienne est ignorée si les données du compte ont changé", async () => {
  let finish;
  coach.readiness.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  await render(); await validate();
  expect(container.querySelector("fieldset").disabled).toBe(true);
  accounts = [{ ...accounts[0], balance: 45000 }];
  await render();
  await act(async () => finish({ data: ready }));
  expect(container.textContent).not.toContain("Processus validé");
  expect(toast.success).not.toHaveBeenCalled();
  expect(container.querySelector("fieldset").disabled).toBe(false);
});

test("une checklist supprimée n’est pas remplacée par la checklist par défaut", async () => {
  user.rules.pre_trade_checklist = [];
  await render(); await validate();
  expect(coach.readiness.mock.calls[0][0].checklist_results).toEqual([]);
  expect(container.textContent).not.toContain("Le setup respecte mon plan de trading");
});

test("un contrôle échoué ne conserve pas une validation précédente", async () => {
  await render(); await validate();
  coach.readiness.mockRejectedValue(new Error("network"));
  await validate();
  expect(container.textContent).not.toContain("Processus validé");
  expect(toast.error).toHaveBeenCalled();
});

test("aucune validation ne peut être affichée à partir d’une réponse malformée", async () => {
  coach.readiness.mockResolvedValue({ data: { status: "ready" } });
  await render(); await validate();
  expect(container.textContent).not.toContain("Processus validé");
  expect(toast.success).not.toHaveBeenCalled();
});
