// OAuth and recovery URLs may carry credentials. Never start third-party
// analytics on these pages, even when analytics consent was already granted.
export function canLoadAnalytics({ pathname = "", search = "", hash = "" }) {
  if (pathname.startsWith("/auth/") || ["/login", "/register", "/forgot-password", "/reset-password", "/verify-email"].includes(pathname)) return false;
  const sensitiveKeys = ["access_token", "refresh_token", "code", "token", "token_hash", "error_description"];
  return [search, hash].every(value => {
    const params = new URLSearchParams(value.replace(/^[?#]/, ""));
    return sensitiveKeys.every(key => !params.has(key));
  });
}
