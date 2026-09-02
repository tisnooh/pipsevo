const HEADER_ALIASES = {
  account: ["account", "account_id", "account id", "compte", "compte id", "nom du compte"],
  date: ["date", "trade date", "date du trade"],
  instrument: ["instrument", "symbol", "symbole", "asset", "actif"],
  direction: ["direction", "side", "sens", "type"],
  entry: ["entry", "entry price", "entree", "entrée", "prix entree", "prix d'entrée"],
  exit_price: ["exit", "exit price", "sortie", "prix sortie", "prix de sortie"],
  stop: ["stop", "stop loss", "sl"],
  take_profit: ["take profit", "tp", "target", "objectif"],
  pnl: ["pnl", "p&l", "profit", "resultat", "résultat"],
  result_status: ["status", "statut", "result status"],
  market_type: ["market", "market type", "marche", "marché", "type de marche"],
  session: ["session"],
  setup: ["setup", "strategy", "strategie", "stratégie"],
  emotion: ["emotion", "émotion"],
  notes: ["notes", "note", "comment"],
  plan_respected: ["plan respected", "plan respecte", "plan respecté"],
  entry_time: ["entry time", "heure entree", "heure d'entrée"],
  exit_time: ["exit time", "heure sortie", "heure de sortie"],
  size: ["size", "quantity", "quantite", "quantité", "lots", "volume"],
  commission: ["commission", "fees", "frais"],
  external_trade_id: ["trade id", "external id", "ticket", "order id", "position", "deal"],
};

const canonical = (value) => String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");

export const detectDelimiter = (line = "") => {
  const candidates = [",", ";", "\t"];
  return candidates.map(delimiter => ({ delimiter, count: splitCsvLine(line, delimiter).length }))
    .sort((a, b) => b.count - a.count)[0]?.delimiter || ",";
};

export const splitCsvLine = (line, delimiter) => {
  const cells = [];
  let value = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"' && quoted && line[i + 1] === '"') { value += '"'; i += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === delimiter && !quoted) { cells.push(value.trim()); value = ""; }
    else value += char;
  }
  cells.push(value.trim());
  return cells;
};

export const parseCsv = (text) => {
  const lines = String(text || "").replace(/^\uFEFF/, "").split(/\r?\n/).filter(line => line.trim());
  if (lines.length < 2) throw new Error("Le fichier CSV doit contenir un en-tête et au moins une ligne.");
  const delimiter = detectDelimiter(lines[0]);
  const headers = splitCsvLine(lines[0], delimiter).map(canonical);
  const mappedHeaders = headers.map(header => Object.entries(HEADER_ALIASES).find(([, aliases]) => aliases.includes(header))?.[0] || header);
  return lines.slice(1).map((line, index) => {
    const cells = splitCsvLine(line, delimiter);
    return { rowNumber: index + 2, raw: Object.fromEntries(mappedHeaders.map((header, cellIndex) => [header, cells[cellIndex] ?? ""])) };
  });
};

const aliasFor = (header) => Object.entries(HEADER_ALIASES)
  .find(([, aliases]) => aliases.includes(canonical(header)))?.[0] || canonical(header);

export const parseMetaTraderHtml = (text) => {
  if (typeof DOMParser === "undefined") throw new Error("La lecture HTML n’est pas disponible dans ce navigateur.");
  const document = new DOMParser().parseFromString(String(text || ""), "text/html");
  const tables = [...document.querySelectorAll("table")];
  const parsed = [];

  tables.forEach(table => {
    const tableRows = [...table.querySelectorAll("tr")];
    const headerIndex = tableRows.findIndex(row => {
      const labels = [...row.querySelectorAll("th,td")].map(cell => canonical(cell.textContent));
      return labels.includes("symbol")
        && labels.some(label => ["type", "side", "direction"].includes(label))
        && labels.some(label => ["profit", "pnl", "p&l"].includes(label));
    });
    if (headerIndex < 0) return;

    const headers = [...tableRows[headerIndex].querySelectorAll("th,td")].map(cell => canonical(cell.textContent));
    tableRows.slice(headerIndex + 1).forEach((row, rowOffset) => {
      const cells = [...row.querySelectorAll("td")].map(cell => cell.textContent.trim());
      if (cells.length < 4 || cells.every(cell => !cell)) return;
      const raw = {};
      const occurrences = {};
      headers.forEach((header, index) => {
        const value = cells[index] ?? "";
        occurrences[header] = (occurrences[header] || 0) + 1;
        if (["time", "date/time", "date time"].includes(header)) {
          if (occurrences[header] === 1) {
            raw.date = value;
            raw.entry_time = value;
          } else raw.exit_time = value;
          return;
        }
        if (header === "price") {
          raw[occurrences[header] === 1 ? "entry" : "exit_price"] = value;
          return;
        }
        raw[aliasFor(header)] = value;
      });
      parsed.push({ rowNumber: headerIndex + rowOffset + 2, raw });
    });
  });

  if (!parsed.length) {
    throw new Error("Aucun tableau de trades MetaTrader reconnu dans ce rapport HTML.");
  }
  return parsed;
};

const parseNumber = (value) => {
  if (value === "" || value === null || value === undefined) return null;
  const cleaned = String(value).replace(/[$€£\s]/g, "").replace(/,(?=\d{1,2}$)/, ".");
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : NaN;
};

const parseDate = (value) => {
  const source = String(value || "").trim();
  if (!source) return null;
  const french = source.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (french) return `${french[3]}-${french[2].padStart(2, "0")}-${french[1].padStart(2, "0")}`;
  const metaTrader = source.match(/^(\d{4})[.\/-](\d{1,2})[.\/-](\d{1,2})(?:\s|$)/);
  if (metaTrader) return `${metaTrader[1]}-${metaTrader[2].padStart(2, "0")}-${metaTrader[3].padStart(2, "0")}`;
  const parsed = new Date(source);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
};

const normalizeDirection = (value) => {
  const key = canonical(value);
  if (["long", "buy", "achat", "b"].includes(key)) return "long";
  if (["short", "sell", "vente", "s"].includes(key)) return "short";
  return null;
};

const normalizeStatus = (value, pnl, exitPrice) => {
  const key = canonical(value);
  if (["open", "ouvert", "ouverte"].includes(key)) return "open";
  if (["cancelled", "canceled", "annule", "annulé"].includes(key)) return "cancelled";
  if (["partial", "partiel", "partielle"].includes(key)) return "partial";
  if (pnl === null && exitPrice === null) return "open";
  if (pnl > 0) return "winner";
  if (pnl < 0) return "loser";
  return "breakeven";
};

const normalizeBoolean = (value) => {
  const key = canonical(value);
  if (["true", "1", "yes", "oui", "y"].includes(key)) return true;
  if (["false", "0", "no", "non", "n"].includes(key)) return false;
  return null;
};

const accountKey = (account) => [account.id, account.name, `${account.firm} ${account.name}`, account.firm].map(canonical);
const findAccounts = (value, accounts) => {
  if (!canonical(value) && accounts.length === 1) return accounts;
  return accounts.filter(account => accountKey(account).includes(canonical(value)));
};

export const tradeFingerprint = (trade) => [
  trade.account_id, trade.date, canonical(trade.instrument), trade.direction,
  trade.entry ?? "", trade.exit_price ?? "", trade.pnl ?? "", trade.external_trade_id ?? "",
].join("|");

const prepareRows = ({ rows, accounts = [], existingTrades = [], importSource = "csv" }) => {
  const existing = new Set(existingTrades.map(tradeFingerprint));
  const seen = new Set();
  return rows.map(({ rowNumber, raw }) => {
    const errors = [];
    const warnings = [];
    const matchingAccounts = findAccounts(raw.account, accounts);
    const account = matchingAccounts.length === 1 ? matchingAccounts[0] : null;
    const date = parseDate(raw.date);
    const direction = normalizeDirection(raw.direction);
    const numericFields = Object.fromEntries(["entry", "exit_price", "stop", "take_profit", "pnl", "size", "commission"].map(key => [key, parseNumber(raw[key])]));
    if (matchingAccounts.length > 1) errors.push("Compte ambigu : utilise son nom ou son ID");
    else if (!account) errors.push("Compte introuvable");
    if (!date) errors.push("Date invalide");
    if (!String(raw.instrument || "").trim()) errors.push("Instrument manquant");
    if (!direction) errors.push("Direction invalide");
    Object.entries(numericFields).forEach(([key, value]) => { if (Number.isNaN(value)) errors.push(`${key} invalide`); });
    const trade = {
      account_id: account?.id,
      date,
      instrument: String(raw.instrument || "").trim().toUpperCase(),
      direction,
      ...numericFields,
      result_status: normalizeStatus(raw.result_status, numericFields.pnl, numericFields.exit_price),
      market_type: canonical(raw.market_type) || account?.market_type || null,
      setup: String(raw.setup || "").trim() || null,
      session: String(raw.session || "").trim() || null,
      emotion: String(raw.emotion || "").trim() || null,
      notes: String(raw.notes || "").trim() || null,
      plan_respected: normalizeBoolean(raw.plan_respected),
      entry_time: String(raw.entry_time || "").trim() || null,
      exit_time: String(raw.exit_time || "").trim() || null,
      external_trade_id: String(raw.external_trade_id || "").trim() || null,
      import_source: importSource,
    };
    const fingerprint = tradeFingerprint(trade);
    trade.import_fingerprint = fingerprint;
    const duplicate = existing.has(fingerprint) || seen.has(fingerprint);
    if (duplicate) warnings.push("Doublon ignoré");
    seen.add(fingerprint);
    return { rowNumber, raw, trade, errors, warnings, duplicate, valid: errors.length === 0 && !duplicate };
  });
};

export const prepareTradeImport = ({ text, accounts = [], existingTrades = [] }) => prepareRows({
  rows: parseCsv(text), accounts, existingTrades, importSource: "csv",
});

export const prepareTradeFileImport = ({ text, fileName = "", accounts = [], existingTrades = [] }) => {
  const html = /\.html?$/i.test(fileName) || /^\s*(?:<!doctype\s+html|<html|<table)/i.test(String(text || ""));
  return prepareRows({
    rows: html ? parseMetaTraderHtml(text) : parseCsv(text),
    accounts,
    existingTrades,
    importSource: html ? "metatrader_html" : "csv",
  });
};
