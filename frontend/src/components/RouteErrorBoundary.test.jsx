import React, { act, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import RouteErrorBoundary from "./RouteErrorBoundary";

let host, root, consoleError;
beforeEach(() => {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  consoleError.mockRestore();
});

test("renders a healthy route without a recovery prompt", () => {
  act(() => root.render(<RouteErrorBoundary><h1>Journal</h1></RouteErrorBoundary>));
  expect(host.textContent).toBe("Journal");
  expect(host.querySelector("button")).toBeNull();
});

test("a missing lazy module shows recovery without an automatic reload", async () => {
  const reload = jest.fn();
  const FailedPage = lazy(() => Promise.reject(new TypeError("Failed to fetch dynamically imported module: private-details")));
  await act(async () => {
    root.render(<RouteErrorBoundary onReload={reload}><Suspense fallback="Chargement"><FailedPage /></Suspense></RouteErrorBoundary>);
  });
  expect(host.querySelector('[role="alert"]').textContent).toContain("Impossible de charger");
  expect(host.textContent).toContain("saisies non enregistrées");
  expect(host.textContent).not.toContain("private-details");
  expect(reload).not.toHaveBeenCalled();
  act(() => host.querySelector("button").click());
  expect(reload).toHaveBeenCalledTimes(1);
});

test("also catches unexpected render failures without exposing their content", () => {
  function FailedPage() { throw new Error("sensitive backend detail"); }
  act(() => root.render(<RouteErrorBoundary><FailedPage /></RouteErrorBoundary>));
  expect(host.querySelector('[role="alert"]')).not.toBeNull();
  expect(host.textContent).not.toContain("sensitive backend detail");
});
