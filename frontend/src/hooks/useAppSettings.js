import { useCallback, useEffect, useState } from "react";
import { formatDate, formatMoney, readSettings, SETTINGS_EVENT } from "@/lib/preferences";

export function useAppSettings() {
  const [settings, setSettings] = useState(readSettings);
  useEffect(() => {
    const sync = event => setSettings(event.detail || readSettings());
    window.addEventListener(SETTINGS_EVENT, sync);
    return () => window.removeEventListener(SETTINGS_EVENT, sync);
  }, []);
  const money = useCallback((value, options) => formatMoney(value, { ...options, settings }), [settings]);
  const date = useCallback((value, options) => formatDate(value, { ...options, settings }), [settings]);
  return { settings, money, date };
}

export default useAppSettings;
