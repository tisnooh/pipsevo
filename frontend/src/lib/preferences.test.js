import { DEFAULT_SETTINGS, formatDate, formatMoney, readSettings, SETTINGS_EVENT, writeSettings } from "./preferences";

beforeEach(() => localStorage.clear());

test("les préférences sont fusionnées et diffusées sans perdre les valeurs par défaut", () => {
  const listener = jest.fn();
  window.addEventListener(SETTINGS_EVENT, listener);
  writeSettings({ language: "en", currency: "GBP" });
  expect(readSettings()).toMatchObject({ ...DEFAULT_SETTINGS, language: "en", currency: "GBP" });
  expect(listener).toHaveBeenCalledTimes(1);
  window.removeEventListener(SETTINGS_EVENT, listener);
});

test("la devise suit la langue et la devise sélectionnées", () => {
  expect(formatMoney(1245.5, { settings: { ...DEFAULT_SETTINGS, language: "en", currency: "GBP" } })).toContain("£1,245.5");
});

test("une date sans heure ne change pas de jour selon le fuseau", () => {
  const settings = { ...DEFAULT_SETTINGS, language: "en", timezone: "America/New_York" };
  expect(formatDate("2026-07-13", { settings })).toBe("07/13/2026");
});
