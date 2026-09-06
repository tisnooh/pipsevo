import { getOAuthDestination, getOAuthError, signInWithGoogle } from "./googleAuth";
import { supabase } from "./supabase";

jest.mock("./supabase", () => ({
  supabaseUrl: "https://project.supabase.co",
  publishableKey: "public-test-key",
  supabase: { auth: { signInWithOAuth: jest.fn() } },
}));

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ external: { google: true } }) });
  supabase.auth.signInWithOAuth.mockReset().mockResolvedValue({ error: null });
});
afterEach(() => { delete global.fetch; });

test("Google uses the existing Supabase client and a fixed same-origin callback", async () => {
  await signInWithGoogle();
  expect(fetch).toHaveBeenCalledWith("https://project.supabase.co/auth/v1/settings", {
    headers: { apikey: "public-test-key" }, cache: "no-store",
  });
  expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({ provider: "google", options: {
    redirectTo: `${window.location.origin}/auth/callback`, queryParams: { prompt: "select_account" },
  } });
});

test.each([
  { ok: true, json: async () => ({ external: { google: false } }) },
  { ok: true, json: async () => ({}) },
  { ok: false },
])("does not send visitors to a raw Supabase error when Google is unavailable", async response => {
  fetch.mockResolvedValue(response);
  await expect(signInWithGoogle()).rejects.toThrow("google_unavailable");
  expect(supabase.auth.signInWithOAuth).not.toHaveBeenCalled();
});

test("network and SDK failures remain recoverable by the UI", async () => {
  fetch.mockRejectedValueOnce(new Error("offline"));
  await expect(signInWithGoogle()).rejects.toThrow("offline");
  supabase.auth.signInWithOAuth.mockResolvedValue({ error: new Error("auth failed") });
  await expect(signInWithGoogle()).rejects.toThrow("auth failed");
});

test("handles OAuth denial and errors without reflecting untrusted provider text", () => {
  expect(getOAuthError("?error=access_denied&error_description=secret")).toBe("cancelled");
  expect(getOAuthError("", "#error=server_error&error_description=secret")).toBe("failed");
  expect(getOAuthError("?error_code=unexpected_failure")).toBe("failed");
  expect(getOAuthError("", "#access_token=test")).toBeNull();
});

test("routes complete profiles to the dashboard and new profiles to onboarding", () => {
  expect(getOAuthDestination({ onboarding_completed: true })).toBe("/app/dashboard");
  expect(getOAuthDestination({ onboarding_completed: false })).toBe("/onboarding");
  expect(getOAuthDestination({ onboarded: true })).toBe("/app/dashboard");
  expect(getOAuthDestination(null)).toBeNull();
  expect(getOAuthDestination({ profile_loading_error: true })).toBeNull();
});
