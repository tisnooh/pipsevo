// Supabase stores calendar dates and clock times separately. Do not send a
// complete CSV timestamp to a `time` column or coerce missing money to zero.
export function finiteInput(value, label, { nullable = true, minimum = -Infinity } = {}) {
  if (value === null || value === undefined || value === "") {
    if (nullable) return null;
    throw new Error(`${label} est obligatoire.`);
  }
  if (!["number", "string"].includes(typeof value) || !String(value).trim()) throw new Error(`${label} invalide.`);
  const number = Number(value);
  if (!Number.isFinite(number) || number < minimum) throw new Error(`${label} invalide.`);
  return number;
}

export function clockInput(value) {
  const source = String(value || "").trim();
  if (!source || /^\d{4}[-./]\d{2}[-./]\d{2}$/.test(source)) return null;
  const match = source.match(/(?:^|[ T])(\d{1,2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(?:$|Z|[+-]\d{2}:?\d{2}$)/);
  if (!match || Number(match[1]) > 23 || Number(match[2]) > 59 || Number(match[3] || 0) > 59) throw new Error("Heure de trade invalide.");
  return `${match[1].padStart(2, "0")}:${match[2]}:${match[3] || "00"}`;
}

export function nativeAccountCurrency(account) {
  if (account?.currency_available === false) throw new Error("La devise native de ce compte n’est pas connue. Aucun montant ne sera importé sous une devise supposée.");
  const currency = String(account?.currency || "USD").toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error("Devise de compte invalide.");
  return currency;
}

export function validateTradeCurrency(payload, account) {
  const currency = nativeAccountCurrency(account);
  if (payload.provider_currency && String(payload.provider_currency).toUpperCase() !== currency) throw new Error(`La devise du trade doit correspondre au compte (${currency}). Aucune conversion automatique n’est effectuée.`);
  return { ...payload, provider_currency: currency };
}

export function accountFinancialPayload(values, previous = null) {
  const allowed = ["name", "firm", "market_type", "balance", "initial_balance", "profit_target", "max_drawdown", "daily_loss_limit", "current_drawdown", "status"];
  const payload = Object.fromEntries(Object.entries(values).filter(([key]) => allowed.includes(key)));
  for (const field of ["balance", "initial_balance", "profit_target", "max_drawdown", "daily_loss_limit", "current_drawdown"]) {
    if (field in payload) payload[field] = finiteInput(payload[field], field, { nullable: false, minimum: field === "initial_balance" ? 0.01 : 0 });
  }
  if (!previous?.integration_account_id && !("current_drawdown" in payload) && ("balance" in payload || "initial_balance" in payload)) {
    const balance = payload.balance ?? previous?.balance;
    const initial = payload.initial_balance ?? previous?.initial_balance;
    if (Number.isFinite(Number(balance)) && Number.isFinite(Number(initial))) payload.current_drawdown = Math.max(0, Number(initial) - Number(balance));
  } else if (previous?.integration_account_id) {
    // A settings form must not overwrite balances or broker risk observations.
    for (const key of ["balance", "initial_balance", "current_drawdown"]) delete payload[key];
  }
  return payload;
}
