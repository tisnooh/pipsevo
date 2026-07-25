const num = (value) => Number(value || 0);

export const calculateSafeWithdrawal = (account, bufferPercent = 20) => {
  if (!account) return null;
  const balance = num(account.balance);
  const initial = num(account.initial_balance);
  const maxDrawdown = Math.max(0, num(account.max_drawdown));
  const safetyBuffer = maxDrawdown * Math.max(0, num(bufferPercent)) / 100;
  const failureFloor = initial - maxDrawdown;
  const protectedFloor = failureFloor + safetyBuffer;
  const safeAmount = Math.max(0, balance - protectedFloor);
  return {
    balance, initial, maxDrawdown, safetyBuffer, failureFloor, protectedFloor, safeAmount,
    projectedBalance: balance - safeAmount,
    remainingDrawdown: Math.max(0, balance - failureFloor),
  };
};

export const evaluateRiskAlerts = ({ accounts = [], trades = [], rules = {}, today = new Date().toISOString().slice(0, 10) }) => {
  const alerts = [];
  const maxTrades = num(rules.max_trades || 0);
  const stopAfterLosses = num(rules.stop_after_loss || 0);
  accounts.forEach(account => {
    const accountTrades = trades.filter(trade => trade.account_id === account.id);
    const todayTrades = accountTrades.filter(trade => trade.date === today);
    const todayPnl = todayTrades.reduce((sum, trade) => sum + num(trade.pnl), 0);
    const dailyLimit = num(account.daily_loss_limit || rules.daily_loss_limit);
    const safe = calculateSafeWithdrawal(account, 20);
    if (safe?.maxDrawdown > 0) {
      const remainingRatio = safe.remainingDrawdown / safe.maxDrawdown;
      if (remainingRatio <= 0) alerts.push({ severity: "critical", accountId: account.id, title: `${account.name} : drawdown dépassé`, detail: "La limite définie pour ce compte est atteinte." });
      else if (remainingRatio <= 0.2) alerts.push({ severity: "warning", accountId: account.id, title: `${account.name} : marge de drawdown faible`, detail: `${Math.round(remainingRatio * 100)}% de la limite reste disponible.` });
    }
    if (dailyLimit > 0) {
      const remaining = dailyLimit + todayPnl;
      if (remaining <= 0) alerts.push({ severity: "critical", accountId: account.id, title: `${account.name} : perte journalière atteinte`, detail: `P&L du jour : ${todayPnl.toFixed(2)}.` });
      else if (remaining <= dailyLimit * 0.2) alerts.push({ severity: "warning", accountId: account.id, title: `${account.name} : limite journalière proche`, detail: `${remaining.toFixed(2)} de marge restante.` });
    }
    if (maxTrades > 0 && todayTrades.length >= maxTrades) alerts.push({ severity: todayTrades.length > maxTrades ? "critical" : "warning", accountId: account.id, title: `${account.name} : limite de trades`, detail: `${todayTrades.length}/${maxTrades} trades aujourd'hui.` });
    if (stopAfterLosses > 0) {
      let losses = 0;
      for (const trade of [...accountTrades].sort((a, b) => `${b.date}|${b.created_at || ""}`.localeCompare(`${a.date}|${a.created_at || ""}`))) {
        if (num(trade.pnl) < 0) losses += 1; else break;
      }
      if (losses >= stopAfterLosses) alerts.push({ severity: "critical", accountId: account.id, title: `${account.name} : pause recommandée`, detail: `${losses} pertes consécutives pour une limite de ${stopAfterLosses}.` });
    }
  });
  return alerts.sort((a, b) => (a.severity === "critical" ? -1 : 1) - (b.severity === "critical" ? -1 : 1));
};
