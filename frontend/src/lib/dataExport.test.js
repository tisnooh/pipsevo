import { buildCsv, buildFullExportFiles, buildZip, EXPORT_SCHEMAS } from "./dataExport";

test("génère un CSV UTF-8 compatible Excel et protège contre les formules", () => {
  const csv = buildCsv([{ name: "=HYPERLINK(\"x\")", balance: -125.5 }], [["Nom", "name"], ["Solde", "balance"]]);
  expect(csv.charCodeAt(0)).toBe(0xFEFF);
  expect(csv).toContain("\"'=HYPERLINK(\"\"x\"\")\"");
  expect(csv).toContain('"-125.5"');
});

test("conserve les tableaux et objets en JSON dans une cellule", () => {
  const csv = buildCsv([{ setups: ["FVG", "Breakout"] }], [["Setups", "setups"]]);
  expect(csv).toContain('[""FVG"",""Breakout""]');
});

test("prépare tous les fichiers de l’archive utilisateur", () => {
  const files = buildFullExportFiles({ profile: { id: "u1" }, accounts: [], trades: [], payouts: [], aiReports: [], settings: {} });
  expect(files.map((file) => file.name)).toEqual(["profil.csv", "preferences.csv", "comptes.csv", "trades.csv", "payouts.csv", "analyses-atlas.csv"]);
  expect(files.find((file) => file.name === "trades.csv").content).toContain(EXPORT_SCHEMAS.trades[0][0]);
});

test("produit une archive ZIP valide sans dépendance externe", () => {
  const zip = buildZip([{ name: "test.csv", content: "a;b\r\n1;2\r\n" }]);
  expect(Array.from(zip.slice(0, 4))).toEqual([0x50, 0x4B, 0x03, 0x04]);
  expect(Array.from(zip.slice(-22, -18))).toEqual([0x50, 0x4B, 0x05, 0x06]);
});
