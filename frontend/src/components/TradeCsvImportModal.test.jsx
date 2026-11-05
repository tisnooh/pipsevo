import React, { act } from "react";
import { createRoot } from "react-dom/client";
import TradeCsvImportModal from "./TradeCsvImportModal";
import { trades } from "@/lib/api";

jest.mock("@/lib/api", () => ({ trades: { importCsv: jest.fn(), rollbackImport: jest.fn() } }));
jest.mock("@/components/ConfirmDialog", () => ({ useConfirmDialog: () => ({ confirm: jest.fn().mockResolvedValue(true), confirmationDialog: null, confirmationOpen: false }) }));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

let container, root;
const props = { accounts: [{ id: "a1", name: "Manuel", firm: "Topstep", currency: "EUR" }], existingTrades: [], onClose: jest.fn(), onImported: jest.fn().mockResolvedValue(undefined) };

beforeEach(async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container);
  trades.importCsv.mockResolvedValue({ data: { batch: { id: "batch1" }, trades: [{ id: "t1" }] } });
  trades.rollbackImport.mockResolvedValue({ data: { ok: true } });
  await act(async () => root.render(<TradeCsvImportModal {...props}/>));
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });

test("an ambiguous Profit cannot import until its net/gross meaning is chosen", async () => {
  const input = container.querySelector('input[type="file"]');
  Object.defineProperty(input, "files", { value: [{ name: "historique.csv", size: 100, text: async () => "Date,Instrument,Direction,Profit\n2026-10-01,NQ,Buy,100" }], configurable: true });
  await act(async () => input.dispatchEvent(new Event("change", { bubbles: true })));
  let importButton = [...container.querySelectorAll("button")].find(button => /^Importer/.test(button.textContent));
  expect(importButton.disabled).toBe(true);
  const mode = container.querySelector('select[aria-label="Nature du P&L dans le fichier"]');
  await act(async () => { mode.value = "net"; mode.dispatchEvent(new Event("change", { bubbles: true })); });
  importButton = [...container.querySelectorAll("button")].find(button => /^Importer/.test(button.textContent));
  expect(importButton.disabled).toBe(false);
  await act(async () => importButton.click());
  expect(trades.importCsv).toHaveBeenCalledWith(expect.objectContaining({ rows: [expect.objectContaining({ pnl: 100, provider_currency: "EUR", account_id: "a1" })] }));
  expect(props.onImported).toHaveBeenCalled();
  expect(importButton.disabled).toBe(true);
  const rollback = [...container.querySelectorAll("button")].find(button => button.textContent.includes("Annuler cet import"));
  await act(async () => rollback.click());
  expect(trades.rollbackImport).toHaveBeenCalledWith("batch1");
});

test("files larger than the safe bound fail before parsing or writing", async () => {
  const text = jest.fn();
  const input = container.querySelector('input[type="file"]');
  Object.defineProperty(input, "files", { value: [{ name: "trop-grand.csv", size: 11 * 1024 * 1024, text }], configurable: true });
  await act(async () => input.dispatchEvent(new Event("change", { bubbles: true })));
  expect(container.textContent).toContain("dépasse 10 Mo");
  expect(text).not.toHaveBeenCalled();
  expect(trades.importCsv).not.toHaveBeenCalled();
});
