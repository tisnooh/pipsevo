import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { formatDate, useAdminData } from "./ui";

test("invalid dates render as unavailable", () => {
  expect(formatDate("invalid")).toBe("—");
  expect(formatDate(null)).toBe("—");
});

test("an older request cannot replace a refreshed admin result", async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const pending = [];
  const loader = jest.fn(() => new Promise(resolve => pending.push(resolve)));
  const container = document.createElement("div");
  const root = createRoot(container);
  function Harness() {
    const state = useAdminData(loader);
    return <><button onClick={state.reload}>Refresh</button><span>{state.loading ? "loading" : state.data}</span></>;
  }
  try {
    await act(async () => { root.render(<Harness />); });
    await act(async () => { container.querySelector("button").click(); });
    await act(async () => { pending[1]({ data: "new result" }); });
    await act(async () => { pending[0]({ data: "old result" }); });
    expect(container.textContent).toContain("new result");
    expect(container.textContent).not.toContain("old result");
  } finally {
    act(() => root.unmount());
  }
});
