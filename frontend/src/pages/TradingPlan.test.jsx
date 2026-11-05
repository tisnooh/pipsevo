import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import TradingPlan from "./TradingPlan";
import { auth } from "@/lib/api";
import { toast } from "sonner";

let mockUser; const mockSetUser = jest.fn();
jest.mock("@/context/AuthContext", () => ({ useAuth: () => ({ user: mockUser, setUser: mockSetUser }) }));
jest.mock("@/lib/api", () => ({ auth: { update: jest.fn() } }));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
let root, container;
const user = () => ({ id: "a", trading_plan: { title: "Saved plan", mission: "Saved purpose" }, rules: { pre_trade_checklist: [] } });
beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true; mockUser = user(); jest.clearAllMocks();
  auth.update.mockImplementation(async values => ({ data: { ...mockUser, ...values } }));
  container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });
const render = () => act(async () => root.render(<MemoryRouter><TradingPlan/></MemoryRouter>));
const click = async text => act(async () => [...container.querySelectorAll("button")].find(item => item.textContent === text).click());
const fill = async value => act(async () => {
  const input = container.querySelector('[aria-labelledby="plan-mission"]');
  Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
});
test("late profile loading displays the saved plan, not an empty editor", async () => {
  mockUser = null; await render(); mockUser = user(); await render();
  expect(container.textContent).toContain("Saved purpose"); expect(container.querySelector("textarea")).toBeNull();
});
test("refresh preserves an edit and cancel restores the latest saved version", async () => {
  await render(); await click("Modifier le plan"); await fill("Local purpose");
  mockUser = { ...mockUser, trading_plan: { title: "Saved plan", mission: "Latest server purpose" } }; await render();
  expect(container.querySelector("textarea").value).toBe("Local purpose");
  await click("Annuler"); expect(container.textContent).toContain("Latest server purpose");
});
test("save failures preserve the draft and show no success", async () => {
  await render(); await click("Modifier le plan"); await fill("Local purpose"); auth.update.mockRejectedValue(new Error("network"));
  await click("Enregistrer le plan"); expect(container.querySelector("textarea").value).toBe("Local purpose");
  expect(toast.success).not.toHaveBeenCalled(); expect(mockSetUser).not.toHaveBeenCalled();
});
