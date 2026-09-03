export const PRE_TRADE_CHECKS_KEY = "pipsevo_pretrade_checks";

export function normalizePreTradeChecks(value, checklist = []) {
  const source = Array.isArray(value)
    ? Object.fromEntries(checklist.map((item, index) => [item.id, Boolean(value[index])]))
    : value && typeof value === "object" ? value : {};
  return Object.fromEntries(checklist.map(item => [item.id, Boolean(source[item.id])]));
}

export function readPreTradeChecks(checklist = []) {
  if (typeof window === "undefined") return normalizePreTradeChecks({}, checklist);
  try {
    return normalizePreTradeChecks(JSON.parse(localStorage.getItem(PRE_TRADE_CHECKS_KEY)), checklist);
  } catch {
    return normalizePreTradeChecks({}, checklist);
  }
}

export function writePreTradeChecks(checks, checklist = []) {
  const normalized = normalizePreTradeChecks(checks, checklist);
  if (typeof window !== "undefined") localStorage.setItem(PRE_TRADE_CHECKS_KEY, JSON.stringify(normalized));
  return normalized;
}

export function clearPreTradeChecks() {
  if (typeof window !== "undefined") localStorage.removeItem(PRE_TRADE_CHECKS_KEY);
}
