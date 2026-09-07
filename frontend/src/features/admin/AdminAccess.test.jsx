import React, { act } from "react";
import { createRoot } from "react-dom/client";
import AdminAccess from "./AdminAccess";

let mockAuthState;
const mockSession = jest.fn();

jest.mock("@/context/AuthContext", () => ({ useAuth: () => mockAuthState }), { virtual: true });
jest.mock("./api", () => ({ adminApi: { session: (...args) => mockSession(...args) } }));
jest.mock("react-router-dom", () => ({
  Navigate: ({ to }) => <div>navigate:{to}</div>,
  Outlet: () => <div>admin-outlet</div>,
}));

describe("AdminAccess", () => {
  let container;
  let root;

  beforeEach(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    root = createRoot(container);
    mockSession.mockReset();
  });

  afterEach(() => act(() => root.unmount()));

  it("uses the authoritative server session even when the cached client role is user", async () => {
    mockAuthState = { loading: false, user: { id: "staff-1", role: "user" } };
    mockSession.mockResolvedValue({ data: { id: "staff-1", role: "admin", permissions: ["overview.read"] } });

    await act(async () => {
      root.render(<AdminAccess />);
      await Promise.resolve();
    });

    expect(mockSession).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain("admin-outlet");
  });

  it("redirects a user rejected by the server", async () => {
    mockAuthState = { loading: false, user: { id: "user-1", role: "admin" } };
    mockSession.mockRejectedValue({ response: { status: 403, data: { detail: "Accès refusé" } } });

    await act(async () => {
      root.render(<AdminAccess />);
      await Promise.resolve();
    });

    expect(container.textContent).toContain("navigate:/app/dashboard");
  });
});
