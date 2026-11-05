import { localDateKey, tradeDateKey, tradeClosureOrderKey } from "./tradeCalendar";
import { measuredTradePnl } from "./tradeAnalytics";

export const finiteFinancialNumber = (value) => {
  if (!["string", "number"].includes(typeof value) || (typeof value === "string" && !value.trim())) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

// A reported floor/used drawdown takes precedence over the legacy fixed-floor
// estimate. Never reconstruct a trailing threshold without its reference.
export const resolveAccountDrawdown = (account, { allowStaticEstimate = true } = {}) => {
  if (!account || account.currency_available === false) return null;
  const balance = finiteFinancialNumber(account.balance);
  const initial = finiteFinancialNumber(account.initial_balance);
  const maxDrawdown = finiteFinancialNumber(account.max_drawdown);
  if ((balance !== null && balance < 0) || maxDrawdown === null || maxDrawdown <= 0) return null;
  const basis = account.drawdown_basis === "equity" ? finiteFinancialNumber(account.equity) : balance;
  const providedFloor = finiteFinancialNumber(account.drawdown_floor ?? account.max_drawdown_level);
  const reportedUsed = finiteFinancialNumber(account.current_drawdown);
  const mode = String(account.drawdown_mode || account.drawdown_type || "").toLowerCase();
  let failureFloor;
  let source;
  if (providedFloor !== null && providedFloor >= 0) {
    if (basis === null) return null;
    failureFloor = providedFloor;
    source = "provided_floor";
  } else if (["static", "fixed", "fixe"].includes(mode) && initial !== null && initial > 0) {
    if (basis === null) return null;
    failureFloor = initial - maxDrawdown;
    source = "configured_static";
  } else if (reportedUsed !== null && reportedUsed >= 0) {
    if (basis === null) return { maxDrawdown, failureFloor: null, remainingDrawdown: Math.max(0, maxDrawdown - reportedUsed), drawdownUsed: reportedUsed, source: "reported_drawdown", basis: null };
    failureFloor = basis - (maxDrawdown - reportedUsed);
    source = "reported_drawdown";
  } else if (["trailing", "suiveur", "trailing_balance", "trailing_equity"].includes(mode)) {
    if (basis === null) return null;
    const highWaterMark = finiteFinancialNumber(account.high_water_mark);
    if (highWaterMark === null || highWaterMark < basis) return null;
    failureFloor = highWaterMark - maxDrawdown;
    source = "trailing_reference";
  } else if (((!mode && allowStaticEstimate && !account.source_provider && !account.integration_account_id) || ["static", "fixed", "fixe"].includes(mode)) && initial !== null && initial > 0) {
    if (basis === null) return null;
    failureFloor = initial - maxDrawdown;
    source = mode ? "configured_static" : "static_estimate";
  } else return null;
  const remainingDrawdown = Math.max(0, basis - failureFloor);
  return {
    maxDrawdown, failureFloor, remainingDrawdown,
    drawdownUsed: Math.max(0, maxDrawdown - (basis - failureFloor)),
    source, basis,
  };
};

export const calculateSafeWithdrawal = (account, bufferPercent = 20, options = {}) => {
  if (!account) return null;
  const balance = finiteFinancialNumber(account.balance);
  const initial = finiteFinancialNumber(account.initial_balance);
  const buffer = finiteFinancialNumber(bufferPercent);
  const risk = resolveAccountDrawdown(account, options);
  if (balance === null || initial === null || initial <= 0 || buffer === null || buffer < 0 || buffer > 100 || !risk || risk.failureFloor === null) return null;
  const { maxDrawdown, failureFloor, remainingDrawdown, source } = risk;
  const safetyBuffer = maxDrawdown * buffer / 100;
  const protectedFloor = failureFloor + safetyBuffer;
  // The protected capital is never a withdrawable profit. This is only an
  // arithmetic estimate, not a provider eligibility/profit-share decision.
  const profitAvailable = Math.max(0, balance - initial);
  const safeAmount = Math.max(0, Math.min(profitAvailable, balance - protectedFloor, risk.basis - protectedFloor));
  return {
    balance, initial, maxDrawdown, safetyBuffer, failureFloor, protectedFloor, safeAmount, profitAvailable, source,
    projectedBalance: balance - safeAmount,
    remainingDrawdown,
  };
};

export const evaluateRiskAlerts = ({ accounts = [], trades = [], rules = {}, today = localDateKey() }) => {
  rules = rules?.configured === false ? {} : (rules || {});
  const alerts = [];
  const maxTrades = finiteFinancialNumber(rules.max_trades) || 0;
  const stopAfterLosses = finiteFinancialNumber(rules.stop_after_loss) || 0;
  accounts.forEach(account => {
    if ((account.status || "active") !== "active") return;
    const accountTrades = trades.filter(trade => trade.account_id === account.id);
    const todayTrades = accountTrades.filter(trade => tradeDateKey(trade.date) === today && !["cancelled", "canceled"].includes(String(trade.result_status || "").toLowerCase()));
    const closed = trade => !["open", "cancelled", "canceled"].includes(String(trade.result_status || "").toLowerCase());
    const todayClosed = todayTrades.filter(closed);
    const measured = todayClosed.map(measuredTradePnl);
    const unknownCount = measured.filter(pnl => pnl === null).length;
    const accountCurrency = account.currency_available === false ? "UNKNOWN" : String(account.currency || account.provider_currency || "USD").toUpperCase();
    const currencies = new Set(todayClosed.map(trade => trade.currency_available === false ? "UNKNOWN" : String(trade.provider_currency || trade.currency || accountCurrency).toUpperCase()));
    const todayPnl = measured.reduce((sum, pnl) => sum + (pnl ?? 0), 0);
    const configuredDailyLimit = finiteFinancialNumber(account.daily_loss_limit);
    const dailyLimit = configuredDailyLimit ?? finiteFinancialNumber(rules.daily_loss_limit) ?? 0;
    const dailyCurrency = configuredDailyLimit !== null ? accountCurrency : String(rules.daily_loss_currency || rules.currency || "USD").toUpperCase();
    const incompatibleCurrency = dailyCurrency !== accountCurrency || [...currencies].some(currency => currency !== dailyCurrency);
    const isSynced = Boolean(account.source_provider || account.integration_account_id || accountTrades.some(trade => trade.source_provider || trade.integration_account_id));
    const risk = resolveAccountDrawdown(account, { allowStaticEstimate: !isSynced });
    if (risk) {
      const remainingRatio = risk.remainingDrawdown / risk.maxDrawdown;
      if (remainingRatio <= 0) alerts.push({ severity: "critical", accountId: account.id, title: `${account.name} : drawdown dépassé`, detail: "La limite définie pour ce compte est atteinte." });
      else if (remainingRatio <= 0.2) alerts.push({ severity: "warning", accountId: account.id, title: `${account.name} : marge de drawdown faible`, detail: `${Math.round(remainingRatio * 100)}% de la limite reste disponible.` });
    } else if (finiteFinancialNumber(account.max_drawdown) > 0) {
      alerts.push({ severity: "warning", accountId: account.id, title: `${account.name} : drawdown non vérifiable`, detail: "Renseigne le seuil actuel ou la référence du drawdown. Aucun seuil suiveur n’est supposé." });
    }
    if (dailyLimit > 0 && (unknownCount > 0 || currencies.size > 1 || incompatibleCurrency || account.currency_available === false)) {
      alerts.push({ severity: "warning", accountId: account.id, title: `${account.name} : perte journalière non vérifiable`, detail: account.currency_available === false || currencies.has("UNKNOWN") ? "La devise native est inconnue. Aucune comparaison avec la limite monétaire ne peut être confirmée." : currencies.size > 1 ? "Les résultats utilisent plusieurs devises. Aucune somme ni conversion automatique n’est appliquée." : incompatibleCurrency ? `La limite est en ${dailyCurrency}, le compte ou ses résultats dans une autre devise. Aucune conversion automatique n’est appliquée.` : `${unknownCount} résultat(s) clôturé(s) manquant(s). La marge journalière ne peut pas être confirmée.` });
    } else if (dailyLimit > 0) {
      const remaining = dailyLimit + todayPnl;
      if (remaining <= 0) alerts.push({ severity: "critical", accountId: account.id, title: `${account.name} : perte journalière atteinte`, detail: `P&L clôturé du jour : ${todayPnl.toFixed(2)}. Positions ouvertes exclues ; règles fournisseur non vérifiées.` });
      else if (remaining <= dailyLimit * 0.2) alerts.push({ severity: "warning", accountId: account.id, title: `${account.name} : limite journalière proche`, detail: `${remaining.toFixed(2)} de marge sur les résultats clôturés ; positions ouvertes exclues.` });
    }
    if (maxTrades > 0 && todayTrades.length >= maxTrades) alerts.push({ severity: todayTrades.length > maxTrades ? "critical" : "warning", accountId: account.id, title: `${account.name} : limite de trades`, detail: `${todayTrades.length}/${maxTrades} trades aujourd'hui.` });
    if (stopAfterLosses > 0) {
      let losses = 0;
      for (const trade of accountTrades.filter(closed).sort((a, b) => tradeClosureOrderKey(b).localeCompare(tradeClosureOrderKey(a)))) {
        const pnl = measuredTradePnl(trade);
        if (pnl !== null && pnl < 0) losses += 1; else break;
      }
      if (losses >= stopAfterLosses) alerts.push({ severity: "critical", accountId: account.id, title: `${account.name} : pause recommandée`, detail: `${losses} pertes consécutives pour une limite de ${stopAfterLosses}.` });
    }
  });
  return alerts.sort((a, b) => (a.severity === "critical" ? -1 : 1) - (b.severity === "critical" ? -1 : 1));
};
