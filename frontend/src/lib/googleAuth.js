import { supabase, supabaseUrl, publishableKey } from "./supabase";
import { AUTH_CONFIG, hasCompletedOnboarding } from "../config/auth";

export const GOOGLE_CALLBACK_PATH = "/auth/callback";

export async function signInWithGoogle() {
  // Check the public provider settings before leaving the app: Supabase's SDK
  // otherwise redirects to a raw error page when the provider is disabled.
  const response = await fetch(`${supabaseUrl}/auth/v1/settings`, {
    headers: { apikey: publishableKey },
    cache: "no-store",
  });
  if (!response.ok) throw new Error("google_unavailable");
  const settings = await response.json();
  if (!settings.external?.google) throw new Error("google_unavailable");
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}${GOOGLE_CALLBACK_PATH}`,
      queryParams: { prompt: "select_account" },
    },
  });
  if (error) throw error;
}

export function getOAuthError(search = "", hash = "") {
  for (const value of [search, hash]) {
    const params = new URLSearchParams(value.replace(/^[?#]/, ""));
    if (params.has("error") || params.has("error_code") || params.has("error_description")) {
      const code = `${params.get("error_code") || ""} ${params.get("error_description") || ""}`.toLowerCase();
      if (code.includes("already confirmed") || code.includes("already been confirmed")) return "already_confirmed";
      if (code.includes("expired") || code.includes("otp_expired")) return "expired";
      return params.get("error") === "access_denied" ? "cancelled" : "failed";
    }
  }
  return null;
}

export function getOAuthDestination(user) {
  if (!user || user.profile_loading_error) return null;
  return hasCompletedOnboarding(user) ? AUTH_CONFIG.authenticatedHomePath : AUTH_CONFIG.postSignUpPath;
}
