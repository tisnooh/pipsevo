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

  test("importe un relevé CSV cTrader", () => {
    const text = "PositionId,TradeType,SymbolName,VolumeInUnits,EntryTime,EntryPrice,ClosingTime,ClosingPrice,NetProfit,Balance\n42,Buy,EURUSD,10000,2026-09-01 09:30:00,1.1000,2026-09-01 10:10:00,1.1050,50.25,10050.25";
    const [row] = prepareTradeFileImport({ text, fileName: "ctrader.csv", accounts });
    expect(row.valid).toBe(true);
    expect(row.trade).toEqual(expect.objectContaining({ date: "2026-09-01", instrument: "EURUSD", direction: "long", size: 10000, entry: 1.1, exit_price: 1.105, pnl: 50.25, external_trade_id: "42" }));
  });

  test("importe la vue Trades de NinjaTrader 8", () => {
    const text = 'Trade number,Instrument,Account,Market position,Quantity,Entry price,Exit price,Entry time,Exit time,Profit,Commission\n18,NQ 12-26,Challenge 50K,Long,2,20100.25,20120.25,02/09/2026 09:30:00,02/09/2026 09:42:00,"$800.00","($8.50)"';
    const [row] = prepareTradeFileImport({ text, fileName: "ninjatrader.csv", accounts });
    expect(row.valid).toBe(true);
    expect(row.trade).toEqual(expect.objectContaining({ date: "2026-09-02", instrument: "NQ 12-26", direction: "long", size: 2, pnl: 800, commission: -8.5, external_trade_id: "18" }));
  });

  test("importe le panneau Trades de Quantower", () => {
    const text = "Account,Date/Time,Symbol,Side,Quantity,Price,Net P/L,Fee,Trade ID\nChallenge 50K,2026-09-02 14:15:00,MNQ,SELL,1,20110.5,-125.50,1.20,QT-77";
    const [row] = prepareTradeFileImport({ text, fileName: "quantower.csv", accounts });
    expect(row.valid).toBe(true);
    expect(row.trade).toEqual(expect.objectContaining({ date: "2026-09-02", instrument: "MNQ", direction: "short", size: 1, entry: 20110.5, pnl: -125.5, commission: 1.2, external_trade_id: "QT-77" }));
  });

  test("importe un journal Trades tabulé Sierra Chart", () => {
    const text = "Symbol\tTrade Type\tEntry Date Time\tExit Date Time\tEntry Price\tExit Price\tTrade Quantity\tProfit/Loss\nESM26\tShort\t2026-09-02 15:00:00\t2026-09-02 15:05:00\t5600.25\t5598.25\t1\t100.00";
    const [row] = prepareTradeFileImport({ text, fileName: "sierra-trades.txt", accounts });
    expect(row.valid).toBe(true);
    expect(row.trade).toEqual(expect.objectContaining({ date: "2026-09-02", instrument: "ESM26", direction: "short", size: 1, pnl: 100 }));
  });
});
