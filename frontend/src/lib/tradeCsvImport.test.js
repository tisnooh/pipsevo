import { detectDelimiter, parseCsv, parseMetaTraderHtml, prepareTradeFileImport, prepareTradeImport, tradeFingerprint } from "./tradeCsvImport";

const accounts = [{ id: "a1", name: "Challenge 50K", firm: "Topstep", market_type: "futures" }];

describe("import CSV de trades", () => {
  test("détecte les séparateurs usuels", () => {
    expect(detectDelimiter("date;instrument;pnl")).toBe(";");
    expect(detectDelimiter("date,instrument,pnl")).toBe(",");
  });

  test("respecte les cellules entre guillemets", () => {
    const [row] = parseCsv('Compte,Date,Instrument,Direction,Notes\nTopstep,25/07/2026,NQ,Achat,"Plan, respecté"');
    expect(row.raw.notes).toBe("Plan, respecté");
  });

  test("normalise une ligne française valide", () => {
    const [row] = prepareTradeImport({ text: "Compte;Date;Instrument;Direction;P&L\nTopstep;25/07/2026;NQ;Achat;125,50", accounts });
    expect(row.valid).toBe(true);
    expect(row.trade).toEqual(expect.objectContaining({ account_id: "a1", date: "2026-07-25", instrument: "NQ", direction: "long", pnl: 125.5, result_status: "winner" }));
  });

  test("bloque les lignes invalides et les doublons", () => {
    const text = "Compte,Date,Instrument,Direction,PnL\nTopstep,2026-07-25,NQ,buy,100\nTopstep,2026-07-25,NQ,buy,100";
    const rows = prepareTradeImport({ text, accounts });
    expect(rows[0].valid).toBe(true);
    expect(rows[1].duplicate).toBe(true);
    const existing = [{ ...rows[0].trade }];
    expect(prepareTradeImport({ text, accounts, existingTrades: existing })[0].duplicate).toBe(true);
    expect(tradeFingerprint(existing[0])).toBe(rows[0].trade.import_fingerprint);
  });

  test("importe un rapport HTML MetaTrader standard", () => {
    const html = `<table><tr><th>Time</th><th>Position</th><th>Symbol</th><th>Type</th><th>Volume</th><th>Price</th><th>Time</th><th>Price</th><th>Commission</th><th>Profit</th></tr><tr><td>2026.07.25 09:30:00</td><td>9876</td><td>EURUSD</td><td>Buy</td><td>0.10</td><td>1.1000</td><td>2026.07.25 10:10:00</td><td>1.1050</td><td>-2.5</td><td>50</td></tr></table>`;
    expect(parseMetaTraderHtml(html)).toHaveLength(1);
    const [row] = prepareTradeFileImport({ text: html, fileName: "report.html", accounts: [accounts[0]] });
    expect(row.valid).toBe(true);
    expect(row.trade).toEqual(expect.objectContaining({ account_id: "a1", instrument: "EURUSD", direction: "long", pnl: 50, import_source: "metatrader_html" }));
  });
});
