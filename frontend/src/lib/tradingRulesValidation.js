const limits = [
  ["max_trades", "Trades maximum par jour", 1, 100, true],
  ["daily_loss_limit", "Perte journalière maximale", Number.MIN_VALUE, Number.MAX_SAFE_INTEGER, false],
  ["max_risk_pct", "Risque maximum par trade", 0.1, 10, false],
  ["stop_after_loss", "Arrêt après pertes consécutives", 1, 20, true],
  ["min_rr", "Ratio risque/rendement minimum", 0.1, 20, false],
  ["max_session_minutes", "Durée maximale d’une session", 15, 1440, true],
];

export function tradingRulesValidation(rules) {
  if (!/^[A-Z]{3}$/.test(rules?.daily_loss_currency || "USD")) return { valid: false, message: "Choisis une devise valide pour la limite journalière." };
  for (const [key, label, min, max, integer] of limits) {
    const value = rules?.[key];
    if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) {
      return { valid: false, message: `${label} : renseigne une valeur ${integer ? "entière " : ""}valide${key === "daily_loss_limit" ? " supérieure à zéro" : ` entre ${min} et ${max}`}.` };
    }
  }
  return { valid: true, message: "" };
}
