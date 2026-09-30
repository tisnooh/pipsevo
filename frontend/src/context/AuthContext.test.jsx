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
const { AuthProvider } = require("./AuthContext");

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
});
