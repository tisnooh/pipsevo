import { detectDelimiter, parseCsv, parseMetaTraderHtml, prepareTradeFileImport, prepareTradeImport, tradeFingerprint } from "./tradeCsvImport";
import { buildCsv, EXPORT_SCHEMAS } from "./dataExport";

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
    const html = `<table><tr><th>Time</th><th>Position</th><th>Symbol</th><th>Type</th><th>Volume</th><th>Price</th><th>Time</th><th>Price</th><th>Commission</th><th>Swap</th><th>Profit</th></tr><tr><td>2026.07.25 09:30:00</td><td>9876</td><td>EURUSD</td><td>Buy</td><td>0.10</td><td>1.1000</td><td>2026.07.25 10:10:00</td><td>1.1050</td><td>-2.5</td><td>-1</td><td>50</td></tr></table>`;
    expect(parseMetaTraderHtml(html)).toHaveLength(1);
    const [row] = prepareTradeFileImport({ text: html, fileName: "report.html", accounts: [accounts[0]] });
    expect(row.valid).toBe(true);
    expect(row.trade).toEqual(expect.objectContaining({ account_id: "a1", instrument: "EURUSD", direction: "long", pnl: 46.5, import_source: "metatrader_html" }));
    expect(prepareTradeFileImport({ text: html, fileName: "report.html", accounts, pnlMode: "net" })[0].trade.pnl).toBe(50);
  });

  test("importe un relevé CSV cTrader", () => {
    const text = "PositionId,TradeType,SymbolName,VolumeInUnits,EntryTime,EntryPrice,ClosingTime,ClosingPrice,NetProfit,Balance\n42,Buy,EURUSD,10000,2026-09-01 09:30:00,1.1000,2026-09-01 10:10:00,1.1050,50.25,10050.25";
    const [row] = prepareTradeFileImport({ text, fileName: "ctrader.csv", accounts });
    expect(row.valid).toBe(true);
    expect(row.trade).toEqual(expect.objectContaining({ date: "2026-09-01", instrument: "EURUSD", direction: "long", size: 10000, entry: 1.1, exit_price: 1.105, pnl: 50.25, external_trade_id: "42" }));
  });

  test("importe la vue Trades de NinjaTrader 8", () => {
    const text = 'Trade number,Instrument,Account,Market position,Quantity,Entry price,Exit price,Entry time,Exit time,Profit,Commission\n18,NQ 12-26,Challenge 50K,Long,2,20100.25,20120.25,02/09/2026 09:30:00,02/09/2026 09:42:00,"$800.00","($8.50)"';
    const [row] = prepareTradeFileImport({ text, fileName: "ninjatrader.csv", accounts, pnlMode: "net" });
    expect(row.valid).toBe(true);
    expect(row.trade).toEqual(expect.objectContaining({ date: "2026-09-02", instrument: "NQ 12-26", direction: "long", size: 2, pnl: 800, commission: 8.5, external_trade_id: "18" }));
  });

  test("importe le panneau Trades de Quantower", () => {
    const text = "Account,Date/Time,Symbol,Side,Quantity,Price,Net P/L,Fee,Trade ID\nChallenge 50K,2026-09-02 14:15:00,MNQ,SELL,1,20110.5,-125.50,1.20,QT-77";
    const [row] = prepareTradeFileImport({ text, fileName: "quantower.csv", accounts });
    expect(row.valid).toBe(true);
    expect(row.trade).toEqual(expect.objectContaining({ date: "2026-09-02", instrument: "MNQ", direction: "short", size: 1, entry: 20110.5, pnl: -125.5, commission: 1.2, external_trade_id: "QT-77" }));
  });

  test("importe un journal Trades tabulé Sierra Chart", () => {
    const text = "Symbol\tTrade Type\tEntry Date Time\tExit Date Time\tEntry Price\tExit Price\tTrade Quantity\tProfit/Loss\nESM26\tShort\t2026-09-02 15:00:00\t2026-09-02 15:05:00\t5600.25\t5598.25\t1\t100.00";
    const [row] = prepareTradeFileImport({ text, fileName: "sierra-trades.txt", accounts, pnlMode: "net" });
    expect(row.valid).toBe(true);
    expect(row.trade).toEqual(expect.objectContaining({ date: "2026-09-02", instrument: "ESM26", direction: "short", size: 1, pnl: 100 }));
  });

  test("rejects ambiguous gross/net profits until the user chooses a mode", () => {
    const text = "Date,Instrument,Direction,Profit,Commission,Swap,Fees\n2026-09-02,EURUSD,Buy,100,-3,-2,1";
    expect(prepareTradeImport({ text, accounts })[0].valid).toBe(false);
    expect(prepareTradeImport({ text, accounts, pnlMode: "gross" })[0].trade.pnl).toBe(94);
    expect(prepareTradeImport({ text, accounts, pnlMode: "net" })[0].trade.pnl).toBe(100);
    const explicitNet = text.replace("Profit,", "Net Profit,");
    expect(prepareTradeImport({ text: explicitNet, accounts, pnlMode: "gross" })[0].trade.pnl).toBe(100);
  });

  test("does not invent missing costs or a closed zero when a result is absent", () => {
    const text = "Date,Instrument,Direction,Gross Profit,Commission\n2026-09-02,EURUSD,Buy,100,2";
    expect(prepareTradeImport({ text, accounts })[0].errors.join(" ")).toContain("Swap");
    const [closed] = prepareTradeImport({ text: "Date,Instrument,Direction,Status,Exit Price\n2026-09-02,EURUSD,Buy,Closed,1.1", accounts });
    expect(closed.trade.pnl).toBeNull();
    expect(closed.trade.result_status).toBe("closed");
  });

  test("rejects impossible dates, malformed values and malformed CSV", () => {
    const [row] = prepareTradeImport({ text: "Date,Instrument,Direction,P&L\n31/02/2026,NQ,Buy,abc", accounts });
    expect(row.errors).toEqual(expect.arrayContaining(["Date invalide", "pnl invalide"]));
    expect(parseCsv('Date,Notes\n2026-09-01,"une\nnote"')[0].raw.notes).toBe("une\nnote");
    expect(() => parseCsv('Date,Notes\n2026-09-01,"non terminé')).toThrow("terminée");
    expect(() => parseCsv("Date,P&L\n2026-09-01,1,2")).toThrow("cellules");
    const [fx] = prepareTradeImport({ text: "Date;Instrument;Direction;Entry;P&L\n2026-09-01;EURUSD;Buy;1,12345;5", accounts });
    expect(fx.trade.entry).toBe(1.12345);
  });

  test("keeps separate same-day trades at different times or sizes, and stable external IDs", () => {
    const text = "Date,Instrument,Direction,P&L,Entry time,Quantity\n2026-09-01,NQ,Buy,100,2026-09-01 10:00:00,1\n2026-09-01,NQ,Buy,100,2026-09-01 11:00:00,1\n2026-09-01,NQ,Buy,100,2026-09-01 11:00:00,2";
    expect(prepareTradeImport({ text, accounts }).every(row => row.valid)).toBe(true);
    const idText = "Date,Instrument,Direction,P&L,Ticket\n2026-09-01,NQ,Buy,100,42";
    const imported = prepareTradeImport({ text: idText, accounts })[0].trade;
    const refreshed = prepareTradeImport({ text: idText.replace(",100,42", ",110,42"), accounts, existingTrades: [imported] })[0];
    expect(refreshed.duplicate).toBe(true);
  });

  test("explicitly supports US dates without guessing an ambiguous day/month", () => {
    const text = "Date,Instrument,Direction,P&L\n09/02/2026,NQ,Buy,100";
    expect(prepareTradeImport({ text, accounts })[0].trade.date).toBe("2026-02-09");
    expect(prepareTradeImport({ text, accounts, dateOrder: "mdy" })[0].trade.date).toBe("2026-09-02");
  });

  test("PipsEvo export round-trips account ID, decimal results, currency and multiline notes", () => {
    const trade = { id: "t1", account_id: "a1", account_name: "Challenge 50K", date: "2026-09-01", instrument: "NQ", direction: "Achat (Long)", pnl: -12.5, provider_currency: "EUR", notes: "ligne 1\nligne 2", entry_time: "10:05", size: 1 };
    const text = buildCsv([trade], EXPORT_SCHEMAS.trades);
    const [row] = prepareTradeImport({ text, accounts: [{ ...accounts[0], currency: "EUR" }] });
    expect(row.valid).toBe(true);
    expect(row.trade).toMatchObject({ account_id: "a1", external_trade_id: "t1", pnl: -12.5, provider_currency: "EUR", entry_time: "10:05", notes: "ligne 1\nligne 2" });
    expect(prepareTradeImport({ text, accounts: [{ ...accounts[0], currency: "EUR" }], existingTrades: [{ ...trade, external_trade_id: "original-provider-id" }] })[0].duplicate).toBe(true);
  });
});
