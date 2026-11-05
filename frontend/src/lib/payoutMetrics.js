import { finiteFinancialNumber } from "./riskEngine";

export function payoutCurrency(account, providerAccount = null, payout = null) {
  // Legacy manual accounts were created in USD. A display preference must not
  // silently rename their currency; provider metadata keeps its native unit.
  if (!payout?.currency && account?.currency_available === false) return "UNKNOWN";
  const native = payout?.currency || providerAccount?.currency || account?.currency;
  return String(native || (account?.source_provider || account?.integration_account_id ? "UNKNOWN" : "USD")).toUpperCase();
}

export function sumPayoutsByCurrency(payouts = [], accounts = [], providerAccounts = {}) {
  return payouts.reduce((groups, payout) => {
    const amount = finiteFinancialNumber(payout.amount);
    if (amount === null) return groups;
    const account = accounts.find(item => item.id === payout.account_id);
    const currency = payoutCurrency(account, providerAccounts[payout.account_id], payout);
    groups[currency] = (groups[currency] || 0) + amount;
    return groups;
  }, {});
}

export function payoutProjection(daily, days, target, now = new Date()) {
  const dailyProfit = finiteFinancialNumber(daily);
  const remainingDays = finiteFinancialNumber(days);
  const objective = finiteFinancialNumber(target);
  if (dailyProfit === null || dailyProfit < 0 || remainingDays === null || !Number.isInteger(remainingDays)
    || remainingDays < 0 || remainingDays > 3650 || objective === null || objective < 0) return null;
  const estimated = dailyProfit * remainingDays;
  if (!Number.isFinite(estimated)) return null;
  const estimatedDate = new Date(now);
  estimatedDate.setDate(estimatedDate.getDate() + remainingDays);
  return { estimated, gap: estimated - objective, estimatedDate };
}
