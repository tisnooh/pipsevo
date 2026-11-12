import fs from "node:fs";
import path from "node:path";
import { prepareTradeFileImport } from "./tradeCsvImport";
import { calculateTradeAnalytics } from "./tradeAnalytics";

test("le fichier de recette donne le même net après réimport, sans doubler les trades", () => {
  const text = fs.readFileSync(path.resolve(__dirname, "../../tests/fixtures/recette-journal.csv"), "utf8");
  const accounts = [{ id: "qa", name: "Recette", currency: "USD" }];
  const read = existingTrades => prepareTradeFileImport({ text, fileName: "recette-journal.csv", accounts, existingTrades, pnlMode: "net" });
  const rows = read([]);
  expect(rows).toHaveLength(2);
  expect(rows.every(row => row.valid && !row.duplicate)).toBe(true);
  const trades = rows.map(row => row.trade);
  expect(read(trades).every(row => row.duplicate)).toBe(true);
  expect(calculateTradeAnalytics(trades, accounts)).toMatchObject({
    total: 2, measuredCount: 2, pnl: 75, winrate: 50, profitFactor: 2.5, avgWin: 125, avgLoss: -50,
  });
});
