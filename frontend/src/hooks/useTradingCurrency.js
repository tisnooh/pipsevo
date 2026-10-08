import { useCallback, useMemo, useState } from "react";
import useAppSettings from "./useAppSettings";
import { tradingCurrencyScope } from "@/lib/tradeCurrency";

export default function useTradingCurrency(trades) {
  const { settings, money: formatMoney } = useAppSettings();
  const [selectedCurrency, selectCurrency] = useState(() => {
    try { return sessionStorage.getItem("pipsevo_results_currency") || ""; } catch { return ""; }
  });
  const setCurrency = useCallback(value => {
    selectCurrency(value);
    try { sessionStorage.setItem("pipsevo_results_currency", value); } catch { /* Storage may be disabled. */ }
  }, []);
  const scope = useMemo(
    () => tradingCurrencyScope(trades, selectedCurrency, settings.currency),
    [trades, selectedCurrency, settings.currency],
  );
  const money = useCallback((value, options) => formatMoney(value, { currency: scope.currency, ...options }), [formatMoney, scope.currency]);
  return { ...scope, money, setCurrency };
}
