import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { AnnouncementBanner, ProductTelemetry } from "./ProductOperations";
import { api } from "@/lib/api";
import { saveCookieConsent } from "@/lib/cookieConsent";

jest.mock("@/context/AuthContext", () => ({ useAuth: () => ({ user: { id: "fixture" } }) }));
jest.mock("@/lib/api", () => ({ api: { post: jest.fn(), get: jest.fn() } }));
let root, container;
beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true; jest.clearAllMocks(); jest.useFakeTimers(); localStorage.clear();
  api.post.mockResolvedValue({}); api.get.mockResolvedValue({ data: { items: [{ id: "announcement", title: "Info", message: "Message", type: "info", dismissible: true }] } });
  container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); jest.restoreAllMocks(); saveCookieConsent(false); jest.useRealTimers(); });
const render = (component, path = "/app/dashboard") => act(async () => root.render(<MemoryRouter initialEntries={[path]}>{component}</MemoryRouter>));
const tick = () => act(async () => jest.advanceTimersByTime(650));

test("internal usage telemetry is off without optional analytics consent", async () => {
  await render(<ProductTelemetry/>); await tick(); expect(api.post).not.toHaveBeenCalled();
});
test("granted telemetry never includes a user's record ID or filter query", async () => {
  saveCookieConsent(true);
  await render(<ProductTelemetry/>, "/app/journal/private-trade-id?account=private-account"); await tick();
  expect(api.post).toHaveBeenCalledWith("/product-events", { event_name: "page.viewed", feature: "app.journal", metadata: { pathname: "/app/journal" } });
});
test("withdrawing consent cancels a pending page-view event", async () => {
  saveCookieConsent(true); await render(<ProductTelemetry/>);
  await act(async () => saveCookieConsent(false)); await tick(); expect(api.post).not.toHaveBeenCalled();
});
test("even granted telemetry excludes URLs carrying authentication material", async () => {
  saveCookieConsent(true); await render(<ProductTelemetry/>, "/app/dashboard?code=fixture-oauth-code"); await tick(); expect(api.post).not.toHaveBeenCalled();
});
test("announcements can be dismissed when browser persistence is blocked", async () => {
  jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
  jest.spyOn(Storage.prototype, "removeItem").mockImplementation(() => { throw new Error("blocked"); });
  jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
  await render(<AnnouncementBanner/>); expect(container.textContent).toContain("Message");
  await act(async () => container.querySelector('button[aria-label="Masquer l’annonce"]').click());
  expect(container.textContent).not.toContain("Message");
});
