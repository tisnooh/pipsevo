import React, { act } from "react";
import { createRoot } from "react-dom/client";

jest.mock("@/lib/api", () => ({ auth: {
  me: jest.fn(), sendWelcome: jest.fn(), login: jest.fn(), register: jest.fn(),
  resendConfirmation: jest.fn(), logout: jest.fn(), deleteAccount: jest.fn(),
} }), { virtual: true });
jest.mock("@/lib/supabase", () => ({ supabase: { auth: {
  getSession: jest.fn(), onAuthStateChange: jest.fn(),
} } }), { virtual: true });
jest.mock("@/lib/preferences", () => ({ readSettings: () => ({ language: "fr" }) }), { virtual: true });
jest.mock("sonner", () => ({ toast: { error: jest.fn() } }));

const { auth: mockApiAuth } = require("@/lib/api");
const { supabase } = require("@/lib/supabase");
const mockSupabaseAuth = supabase.auth;
const { AuthProvider, useAuth } = require("./AuthContext");
let context;
function SessionState() { context = useAuth(); return <output>{context.user?.id || "signed-out"}</output>; }
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };

const session = {
  user: {
    id: "google-user-1",
    email: "trader@example.com",
    user_metadata: { provider: "google", language: "fr" },
  },
};

describe("AuthProvider welcome email", () => {
  let container;
  let root;
  let authChange;

  beforeEach(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    jest.clearAllMocks();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    mockApiAuth.me.mockResolvedValue({ data: { id: session.user.id, email: session.user.email } });
    mockApiAuth.sendWelcome.mockResolvedValue({ data: { ok: true, status: "sent" } });
    mockSupabaseAuth.getSession.mockResolvedValue({ data: { session }, error: null });
    mockSupabaseAuth.onAuthStateChange.mockImplementation((callback) => {
      authChange = callback;
      return { data: { subscription: { unsubscribe: jest.fn() } } };
    });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  test("requests the idempotent welcome email for a Google account without metadata flag", async () => {
    await act(async () => {
      root.render(<AuthProvider><div>App</div></AuthProvider>);
    });
    expect(mockApiAuth.sendWelcome).toHaveBeenCalledTimes(1);
    expect(mockApiAuth.sendWelcome).toHaveBeenCalledWith("fr");
  });

  test("does not request a duplicate during token refreshes in the same session", async () => {
    await act(async () => {
      root.render(<AuthProvider><div>App</div></AuthProvider>);
    });
    await act(async () => {
      authChange("TOKEN_REFRESHED", session);
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    });
    expect(mockApiAuth.sendWelcome).toHaveBeenCalledTimes(1);
  });

  test("a delayed profile cannot undo sign-out", async () => {
    const pending = deferred(); mockApiAuth.me.mockReturnValueOnce(pending.promise);
    await act(async () => root.render(<AuthProvider><SessionState/></AuthProvider>));
    await act(async () => authChange("SIGNED_OUT", null));
    await act(async () => pending.resolve({ data: { id: session.user.id } }));
    expect(container.textContent).toBe("signed-out"); expect(context.loading).toBe(false);
    expect(mockApiAuth.sendWelcome).not.toHaveBeenCalled();
  });

  test("queued sign-in refreshes are canceled after sign-out", async () => {
    await act(async () => root.render(<AuthProvider><SessionState/></AuthProvider>));
    const calls = mockApiAuth.me.mock.calls.length;
    await act(async () => {
      authChange("SIGNED_IN", session); authChange("SIGNED_OUT", null);
      await new Promise(resolve => window.setTimeout(resolve, 0));
    });
    expect(container.textContent).toBe("signed-out"); expect(mockApiAuth.me).toHaveBeenCalledTimes(calls);
  });

  test("old account responses cannot replace the newly signed-in account", async () => {
    const pending = deferred(); mockApiAuth.me.mockReturnValueOnce(pending.promise);
    await act(async () => root.render(<AuthProvider><SessionState/></AuthProvider>));
    const next = { user: { id: "user-b", email: "b@example.test", user_metadata: {} } };
    mockApiAuth.me.mockResolvedValue({ data: { id: "user-b", name: "B" } });
    await act(async () => { authChange("SIGNED_IN", next); await new Promise(resolve => window.setTimeout(resolve, 0)); });
    await act(async () => pending.resolve({ data: { id: session.user.id } }));
    expect(container.textContent).toBe("user-b");
  });

  test("profile failure on another account never preserves the previous user's state", async () => {
    await act(async () => root.render(<AuthProvider><SessionState/></AuthProvider>));
    mockApiAuth.me.mockRejectedValueOnce(new Error("profile unavailable"));
    const next = { user: { id: "user-b", email: "b@example.test", user_metadata: {} } };
    await act(async () => { authChange("SIGNED_IN", next); await new Promise(resolve => window.setTimeout(resolve, 0)); });
    expect(container.textContent).toBe("user-b"); expect(context.user.profile_loading_error).toBe(true);
  });

  test("the previous profile is hidden immediately while a new account loads", async () => {
    await act(async () => root.render(<AuthProvider><SessionState/></AuthProvider>));
    const pending = deferred(); mockApiAuth.me.mockReturnValueOnce(pending.promise);
    const next = { user: { id: "user-b", email: "b@example.test", user_metadata: {} } };
    await act(async () => authChange("SIGNED_IN", next));
    expect(container.textContent).toBe("signed-out"); expect(context.loading).toBe(true);
    await act(async () => new Promise(resolve => window.setTimeout(resolve, 0)));
    expect(container.textContent).toBe("signed-out");
    await act(async () => pending.resolve({ data: { id: "user-b", name: "B" } }));
    expect(container.textContent).toBe("user-b"); expect(context.loading).toBe(false);
  });

  test("profile recovery retries the current session and clears the fallback", async () => {
    mockApiAuth.me.mockRejectedValueOnce(new Error("profile unavailable"));
    await act(async () => root.render(<AuthProvider><SessionState/></AuthProvider>));
    expect(context.user.profile_loading_error).toBe(true);
    mockApiAuth.me.mockResolvedValueOnce({ data: { id: session.user.id, onboarding_completed: true, rules: { max_trades: 5 } } });
    await act(async () => context.refreshProfile());
    expect(context.user.profile_loading_error).toBeUndefined();
    expect(context.user.rules).toEqual({ max_trades: 5 });
    expect(context.loading).toBe(false);
  });

  test("failed refresh of an existing profile blocks private UI instead of retaining stale authority", async () => {
    await act(async () => root.render(<AuthProvider><SessionState/></AuthProvider>));
    mockApiAuth.me.mockRejectedValueOnce(new Error("profile unavailable"));
    await act(async () => context.refreshProfile());
    expect(context.user.id).toBe(session.user.id);
    expect(context.user.profile_loading_error).toBe(true);
    expect(context.loading).toBe(false);
    mockApiAuth.me.mockResolvedValueOnce({ data: { id: session.user.id, status: "suspended" } });
    await act(async () => context.refreshProfile());
    expect(context.user.status).toBe("suspended");
    expect(context.user.profile_loading_error).toBeUndefined();
  });

  test("session storage failure finishes loading instead of leaving an endless spinner", async () => {
    mockSupabaseAuth.getSession.mockRejectedValueOnce(new Error("storage unavailable"));
    await act(async () => root.render(<AuthProvider><SessionState/></AuthProvider>));
    expect(context.loading).toBe(false); expect(context.user).toBeNull();
    expect(mockApiAuth.me).not.toHaveBeenCalled();
  });

  test("session expiry cancels a pending profile and later settings updates", async () => {
    await act(async () => root.render(<AuthProvider><SessionState/></AuthProvider>));
    const pending = deferred(); mockApiAuth.me.mockReturnValueOnce(pending.promise);
    const oldUpdater = context.setUser;
    await act(async () => { authChange("TOKEN_REFRESHED", session); await new Promise(resolve => window.setTimeout(resolve, 0)); });
    await act(async () => window.dispatchEvent(new Event("pipsevo:session-expired")));
    await act(async () => { pending.resolve({ data: { id: session.user.id } }); oldUpdater({ id: session.user.id, name: "Late settings" }); });
    expect(container.textContent).toBe("signed-out"); expect(context.loading).toBe(false);
  });
});
