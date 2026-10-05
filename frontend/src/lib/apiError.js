export function apiErrorMessage(error, fallback = "Une erreur est survenue.") {
  const detail = error?.response?.data?.detail;
  if (typeof detail === "string" && detail) return detail;
  if (detail && typeof detail === "object" && !Array.isArray(detail)) {
    for (const key of ["message", "error", "detail"]) if (typeof detail[key] === "string" && detail[key]) return detail[key];
  }
  if (Array.isArray(detail)) {
    const messages = detail.map(item => item?.msg).filter(value => typeof value === "string");
    if (messages.length) return messages.join(" · ");
  }
  return typeof error?.message === "string" && error.message ? error.message : fallback;
}
