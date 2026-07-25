import { detectDelimiter, parseCsv, prepareTradeImport, tradeFingerprint } from "./tradeCsvImport";

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
});
