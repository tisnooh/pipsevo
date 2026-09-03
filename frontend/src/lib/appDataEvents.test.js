import {
  APP_DATA_CHANGED_EVENT,
  dataChangeMatches,
  listenForAppDataChanges,
  notifyAppDataChanged,
} from "./appDataEvents";

describe("synchronisation des données applicatives", () => {
  test("notifie uniquement les consommateurs du domaine modifié", () => {
    const accountsListener = jest.fn();
    const tradesListener = jest.fn();
    const stopAccounts = listenForAppDataChanges(accountsListener, ["accounts"]);
    const stopTrades = listenForAppDataChanges(tradesListener, ["trades"]);

    notifyAppDataChanged(["trades", "dashboard"]);

    expect(accountsListener).not.toHaveBeenCalled();
    expect(tradesListener).toHaveBeenCalledTimes(1);
    stopAccounts();
    stopTrades();
  });

  test("le domaine global invalide toutes les vues", () => {
    const event = new CustomEvent(APP_DATA_CHANGED_EVENT, { detail: { domains: ["all"] } });
    expect(dataChangeMatches(event, ["accounts"])).toBe(true);
    expect(dataChangeMatches(event, ["trades", "payouts"])).toBe(true);
  });
});
