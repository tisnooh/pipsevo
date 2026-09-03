import { useCallback, useEffect, useState } from "react";
import { formatDate, formatMoney, listenForSettingsChanges, readSettings } from "@/lib/preferences";

export function useAppSettings() {
  const [settings, setSettings] = useState(readSettings);
  useEffect(() => listenForSettingsChanges(setSettings), []);
  const money = useCallback((value, options) => formatMoney(value, { ...options, settings }), [settings]);
  const date = useCallback((value, options) => formatDate(value, { ...options, settings }), [settings]);
  return { settings, money, date };
}

export default useAppSettings;
