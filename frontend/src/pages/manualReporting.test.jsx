import React, { act } from "react";
import { createRoot } from "react-dom/client";
import Dashboard from "./Dashboard";
import Analytics from "./Analytics";
import DayView from "./DayView";
import { JournalPage } from "./Journal";
import { accounts, trades, tradeScreenshots } from "@/lib/api";
import { localDateKey } from "@/lib/tradeCalendar";
import { notifyAppDataChanged } from "@/lib/appDataEvents";
import { toast } from "sonner";

let mockUser = { id: "owner-a", name: "Test manuel", trader_type: "futures" };
let mockScreenshotFiles = [];
let mockTradeId = "";
let mockSavePayload = { account_id: "a1", instrument: "NQ", direction: "long", pnl: 50, result_status: "winner", screenshots: [] };

jest.mock("@/lib/api", () => ({
  trades: { list: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() }, accounts: { list: jest.fn() },
  integrationConnections: { list: jest.fn().mockResolvedValue({ data: [] }) },
  tradeScreenshots: { upload: jest.fn(), delete: jest.fn() },
}));
jest.mock("react-router-dom", () => {
  const React = require("react");
  return { Link: ({ children, to, ...props }) => <a href={to} {...props}>{children}</a>, useLocation: () => ({ search: "", pathname: "/app/journal" }), useNavigate: () => jest.fn(), useParams: () => ({ tradeId: mockTradeId }), useSearchParams: () => [new URLSearchParams(), jest.fn()] };
});
jest.mock("recharts", () => {
  const React = require("react");
  const Container = ({ children }) => <div>{children}</div>;
  const Chart = ({ children }) => <svg>{children}</svg>;
  const Fragment = ({ children }) => <>{children}</>;
  return Object.fromEntries(["Area", "AreaChart", "Bar", "BarChart", "CartesianGrid", "Cell", "Pie", "PieChart", "ReferenceLine", "ResponsiveContainer", "Scatter", "ScatterChart", "Tooltip", "XAxis", "YAxis"].map(name => [name, name.endsWith("Chart") ? Chart : name === "ResponsiveContainer" ? Container : Fragment]));
});
jest.mock("framer-motion", () => {
  const React = require("react");
  const Div = ({ children, initial, animate, transition, whileHover, whileTap, exit, ...props }) => <div {...props}>{children}</div>;
  return { motion: { div: Div, tr: ({ children, initial, animate, transition, ...props }) => <tr {...props}>{children}</tr> } };
});
jest.mock("@/context/AuthContext", () => ({ useAuth: () => ({ user: mockUser }) }));
jest.mock("@/hooks/useAppSettings", () => {
  const useAppSettings = () => ({ settings: { currency: "USD" }, money: (amount, options) => `${options?.currency || "USD"} ${amount}`, date: value => value });
  return { __esModule: true, default: useAppSettings, useAppSettings };
});
jest.mock("@/components/CommercialBanner", () => () => null);
jest.mock("@/components/dashboard/DashboardTemplateManager", () => ({ DashboardTemplateManager: () => null }));
jest.mock("@/components/CsvExportButton", () => () => null);
jest.mock("@/components/TradeCalendar", () => () => null);
jest.mock("@/components/MobileTradeList", () => () => null);
jest.mock("@/components/PrivateTradeImage", () => () => null);
jest.mock("@/components/ConfirmDialog", () => ({ useConfirmDialog: () => ({ confirm: jest.fn().mockResolvedValue(true), confirmationDialog: null }) }));
jest.mock("@/components/TradeFormModal", () => ({ onSave }) => <button onClick={() => onSave(mockSavePayload, mockScreenshotFiles)}>Enregistrer le test</button>);
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn() } }));

let container, root;
const account = { id: "a1", name: "Compte manuel", firm: "Topstep", currency: "USD", balance: 50000, initial_balance: 50000, max_drawdown: 2000 };
beforeEach(() => {
  jest.resetAllMocks();
  Object.defineProperty(global.crypto, "randomUUID", { configurable: true, value: jest.fn(() => "12345678-1234-4123-8123-123456789abc") });
  mockUser = { id: "owner-a", name: "Test manuel", trader_type: "futures" };
  mockScreenshotFiles = [];
  mockTradeId = "";
  mockSavePayload = { account_id: "a1", instrument: "NQ", direction: "long", pnl: 50, result_status: "winner", screenshots: [] };
  global.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container);
  window.sessionStorage.clear(); window.localStorage.clear();
  accounts.list.mockResolvedValue({ data: [account] });
  const { integrationConnections } = require("@/lib/api");
  integrationConnections.list.mockResolvedValue({ data: [] });
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); jest.restoreAllMocks(); });

test.each([Dashboard, Analytics, DayView, JournalPage])("%p reports the same native net P&L and measured win rate", async Page => {
  const date = localDateKey();
  trades.list.mockResolvedValue({ data: [
    { id: "1", account_id: "a1", instrument: "NQ", date, pnl: 100, result_status: "winner" },
    { id: "2", account_id: "a1", instrument: "NQ", date, pnl: -20, result_status: "loser" },
    { id: "3", account_id: "a1", instrument: "NQ", date, pnl: 0, result_status: "breakeven" },
    { id: "4", account_id: "a1", instrument: "NQ", date, pnl: 999, result_status: "open" },
    { id: "5", account_id: "a1", instrument: "NQ", date, pnl: null, result_status: "closed" },
  ] });
  await act(async () => root.render(<Page/>));
  expect(container.textContent).toContain("USD 80");
  expect(container.textContent).toContain("33.3%");
});

test.each([Dashboard, Analytics, DayView, JournalPage])("%p does not claim 0% wins when no net result exists", async Page => {
  trades.list.mockResolvedValue({ data: [{ id: "open", account_id: "a1", date: localDateKey(), pnl: null, result_status: "open" }] });
  await act(async () => root.render(<Page/>));
  expect(container.textContent).not.toMatch(/0\.0%/);
  expect(container.textContent).toContain("—");
});

test("storage failure after saving a manual trade never deletes that saved trade", async () => {
  trades.list.mockResolvedValue({ data: [] }); trades.create.mockResolvedValue({ data: { id: "saved" } });
  await act(async () => root.render(<JournalPage/>));
  const newTrade = [...container.querySelectorAll("button")].find(button => button.textContent.includes("Nouveau trade"));
  await act(async () => newTrade.click());
  jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Storage disabled"); });
  const save = [...container.querySelectorAll("button")].find(button => button.textContent.includes("Enregistrer le test"));
  await act(async () => save.click());
  expect(trades.create).toHaveBeenCalled();
  expect(trades.delete).not.toHaveBeenCalled();
});

const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const result = pnl => ({ data: [{ id: `trade-${pnl}`, account_id: "a1", instrument: "NQ", date: localDateKey(), pnl, result_status: "closed" }] });

test.each([Dashboard, Analytics, DayView, JournalPage])("%p ignores an older refresh arriving after a newer one", async Page => {
  const older = deferred();
  trades.list.mockReturnValueOnce(older.promise).mockResolvedValue(result(80));
  await act(async () => root.render(<Page/>));
  await act(async () => notifyAppDataChanged(["trades"]));
  expect(container.textContent).toContain("USD 80");
  await act(async () => older.resolve(result(777)));
  expect(container.textContent).toContain("USD 80");
  expect(container.textContent).not.toContain("USD 777");
});

test.each([Dashboard, Analytics, DayView, JournalPage])("%p clears stale results when a refresh fails", async Page => {
  trades.list.mockResolvedValueOnce(result(80)).mockRejectedValueOnce(new Error("Journal unavailable"));
  await act(async () => root.render(<Page/>));
  expect(container.textContent).toContain("USD 80");
  await act(async () => notifyAppDataChanged(["trades"]));
  expect(container.textContent).toContain("Journal unavailable");
  expect(container.textContent).not.toContain("USD 80");
  expect(container.textContent).not.toContain("Données synchronisées avec ton journal");
  expect(container.textContent).not.toContain("Aucune séance sur cette période");
  expect(container.textContent).not.toContain("Ajoute un compte pour commencer");
});

test.each([Dashboard, Analytics, DayView, JournalPage])("%p isolates successive A -> B -> A session incarnations", async Page => {
  const older = deferred();
  trades.list.mockResolvedValueOnce(result(80)).mockReturnValueOnce(older.promise).mockResolvedValueOnce(result(20)).mockResolvedValueOnce(result(30));
  await act(async () => root.render(<Page/>));
  await act(async () => notifyAppDataChanged(["trades"]));
  mockUser = { ...mockUser, id: "owner-b" };
  await act(async () => root.render(<Page/>));
  expect(container.textContent).toContain("USD 20");
  expect(container.textContent).not.toContain("USD 80");
  mockUser = { ...mockUser, id: "owner-a" };
  await act(async () => root.render(<Page/>));
  expect(container.textContent).toContain("USD 30");
  await act(async () => older.resolve(result(777)));
  expect(container.textContent).toContain("USD 30");
  expect(container.textContent).not.toContain("USD 777");
});

test.each([Dashboard, Analytics, DayView, JournalPage])("%p rejects a malformed reporting response instead of crashing", async Page => {
  trades.list.mockResolvedValue({ data: null });
  await act(async () => root.render(<Page/>));
  expect(container.textContent).toContain("La réponse du journal est incomplète");
});

async function openManualSave() {
  trades.list.mockResolvedValue({ data: [] });
  trades.create.mockResolvedValue({ data: { id: "saved" } });
  await act(async () => root.render(<JournalPage/>));
  await act(async () => [...container.querySelectorAll("button")].find(button => button.textContent.includes("Nouveau trade")).click());
  return [...container.querySelectorAll("button")].find(button => button.textContent.includes("Enregistrer le test"));
}

test("failed screenshot upload preserves the result and closes creation to prevent duplicates", async () => {
  mockScreenshotFiles = [new File(["image"], "trade.png", { type: "image/png" })];
  tradeScreenshots.upload.mockRejectedValue(new Error("Upload unavailable"));
  const save = await openManualSave();
  await act(async () => save.click());
  expect(trades.create).toHaveBeenCalledTimes(1);
  expect(trades.delete).not.toHaveBeenCalled();
  expect(toast.warning).toHaveBeenCalledWith(expect.stringContaining("Le trade est enregistré"));
  expect(container.textContent).not.toContain("Enregistrer le test");
});

test("a later upload failure cleans only unattached files, never the saved trade", async () => {
  mockScreenshotFiles = [new File(["one"], "one.png"), new File(["two"], "two.png")];
  tradeScreenshots.upload.mockResolvedValueOnce("owner-a/saved/one.png").mockRejectedValueOnce(new Error("Upload unavailable"));
  tradeScreenshots.delete.mockResolvedValue({ data: { ok: true } });
  const save = await openManualSave();
  await act(async () => save.click());
  expect(tradeScreenshots.delete).toHaveBeenCalledWith(["owner-a/saved/one.png"]);
  expect(trades.delete).not.toHaveBeenCalled();
  expect(trades.update).not.toHaveBeenCalled();
});

test("an ambiguous attachment write never deletes possibly referenced screenshots", async () => {
  mockScreenshotFiles = [new File(["one"], "one.png")];
  tradeScreenshots.upload.mockResolvedValue("owner-a/saved/one.png");
  trades.update.mockRejectedValue(new Error("Response timeout after commit"));
  const save = await openManualSave();
  await act(async () => save.click());
  expect(trades.update).toHaveBeenCalledWith("saved", { screenshots: ["owner-a/saved/one.png"] });
  expect(tradeScreenshots.delete).not.toHaveBeenCalled();
  expect(trades.delete).not.toHaveBeenCalled();
});

test("a double click cannot create two trades while one save is pending", async () => {
  const pending = deferred();
  const save = await openManualSave();
  trades.create.mockReturnValue(pending.promise);
  await act(async () => { save.click(); save.click(); });
  expect(trades.create).toHaveBeenCalledTimes(1);
  await act(async () => pending.resolve({ data: { id: "saved" } }));
});

test("retrying one form after a network failure retains its original creation ID", async () => {
  const save = await openManualSave();
  trades.create.mockRejectedValueOnce(new Error("Network unavailable")).mockResolvedValueOnce({ data: { id: "saved" } });
  await act(async () => save.click());
  expect(container.textContent).toContain("Enregistrer le test");
  await act(async () => [...container.querySelectorAll("button")].find(button => button.textContent.includes("Enregistrer le test")).click());
  expect(trades.create).toHaveBeenCalledTimes(2);
  expect(trades.create.mock.calls[0][1]).toEqual(trades.create.mock.calls[1][1]);
  expect(trades.create.mock.calls[0][1]).toEqual({ requestId: "12345678-1234-4123-8123-123456789abc" });
});

test("a recovered first save with changed form data directs the user to edit the existing trade", async () => {
  const save = await openManualSave();
  const conflict = Object.assign(new Error("Recharge et modifie le trade existant"), { saved_trade_id: "saved" });
  trades.create.mockRejectedValue(conflict);
  await act(async () => save.click());
  expect(toast.warning).toHaveBeenCalledWith("Recharge et modifie le trade existant");
  expect(container.textContent).not.toContain("Enregistrer le test");
  expect(trades.delete).not.toHaveBeenCalled();
});

test("a save completed for an old session cannot continue uploading into the new one", async () => {
  const pending = deferred();
  mockScreenshotFiles = [new File(["one"], "one.png")];
  const save = await openManualSave();
  trades.create.mockReturnValue(pending.promise);
  await act(async () => save.click());
  mockUser = { ...mockUser, id: "owner-b" };
  await act(async () => root.render(<JournalPage/>));
  await act(async () => pending.resolve({ data: { id: "saved" } }));
  expect(tradeScreenshots.upload).not.toHaveBeenCalled();
  expect(trades.update).not.toHaveBeenCalled();
  expect(trades.delete).not.toHaveBeenCalled();
  expect(toast.success).not.toHaveBeenCalled();
});

test("editing saves the financial result even if a new capture cannot be uploaded", async () => {
  mockTradeId = "existing";
  const existing = { ...result(80).data[0], id: "existing", screenshots: [] };
  trades.list.mockResolvedValue({ data: [existing] });
  trades.update.mockResolvedValue({ data: { ...existing, pnl: 50 } });
  mockScreenshotFiles = [new File(["one"], "one.png")];
  tradeScreenshots.upload.mockRejectedValue(new Error("Upload unavailable"));
  await act(async () => root.render(<JournalPage/>));
  await act(async () => container.querySelector('[aria-label="Modifier ce trade"]').click());
  await act(async () => [...container.querySelectorAll("button")].find(button => button.textContent.includes("Enregistrer le test")).click());
  expect(trades.update).toHaveBeenCalledWith("existing", mockSavePayload);
  expect(trades.delete).not.toHaveBeenCalled();
  expect(toast.warning).toHaveBeenCalledWith(expect.stringContaining("Le trade est enregistré"));
});

test("a successful but malformed save response closes creation and asks to inspect the journal", async () => {
  const save = await openManualSave();
  trades.create.mockResolvedValue({ data: {} });
  await act(async () => save.click());
  expect(trades.delete).not.toHaveBeenCalled();
  expect(toast.warning).toHaveBeenCalledWith(expect.stringContaining("éviter un doublon"));
  expect(container.textContent).not.toContain("Enregistrer le test");
});

test.each([Dashboard, Analytics, DayView, JournalPage])("%p never presents an open result or planned R as realized", async Page => {
  trades.list.mockResolvedValue({ data: [
    { ...result(80).data[0], r: 2 },
    { ...result(999).data[0], result_status: "open", r: 9.99 },
  ] });
  await act(async () => root.render(<Page/>));
  if (Page === Analytics) {
    await act(async () => [...container.querySelectorAll("button")].find(button => button.textContent === "Trades").click());
  }
  expect(container.textContent).toContain("USD 80");
  expect(container.textContent).not.toContain("USD 999");
  expect(container.textContent).not.toContain("9.99R");
});
