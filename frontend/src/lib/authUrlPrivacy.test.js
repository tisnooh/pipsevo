import { canLoadAnalytics } from "./authUrlPrivacy";

test.each(["/auth/callback", "/login", "/register", "/forgot-password", "/reset-password", "/verify-email"])("does not load analytics on %s", pathname => {
  expect(canLoadAnalytics({ pathname })).toBe(false);
});
test.each(["access_token", "refresh_token", "code", "token", "token_hash", "error_description"])("does not send %s from an auth link to analytics", key => {
  expect(canLoadAnalytics({ pathname: "/onboarding", hash: `#${key}=sensitive` })).toBe(false);
  expect(canLoadAnalytics({ pathname: "/", search: `?${key}=sensitive` })).toBe(false);
});
test("normal pages can still load consented analytics once the auth URL is clean", () => {
  expect(canLoadAnalytics({ pathname: "/app/dashboard", search: "", hash: "" })).toBe(true);
  expect(canLoadAnalytics({ pathname: "/", hash: "#features" })).toBe(true);
});
