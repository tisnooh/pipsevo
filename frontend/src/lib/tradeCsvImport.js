const HEADER_ALIASES = {
  account: ["account", "compte", "nom du compte"],
  account_id: ["account_id", "account id", "compte id"],
  date: ["date", "date/time", "date time", "datetime", "trade date", "date du trade"],
  instrument: ["instrument", "symbol", "symbolname", "symbol name", "symbole", "contract", "product", "asset", "actif"],
  direction: ["direction", "side", "sens", "type", "trade type", "tradetype", "market position", "market pos.", "opening direction", "b/s"],
  entry: ["entry", "entry price", "entryprice", "avg. entry price", "average entry price", "entree", "entrée", "prix entree", "prix d'entrée", "price"],
  exit_price: ["exit", "exit price", "exitprice", "closing price", "closingprice", "avg. exit price", "sortie", "prix sortie", "prix de sortie"],
  stop: ["stop", "stop loss", "sl"],
  take_profit: ["take profit", "tp", "target", "objectif"],
  pnl: ["pnl", "p&l", "net p/l", "net pnl", "netprofit", "net profit", "p&l net", "profit net", "resultat", "résultat"],
  gross_pnl: ["gross pnl", "gross profit", "gross p/l", "p&l brut", "profit brut"],
  ambiguous_pnl: ["profit", "profit/loss", "profit loss", "closed p/l", "realized p&l", "realized pnl"],
  result_status: ["status", "statut", "result status"],
  market_type: ["market", "market type", "marche", "marché", "type de marche"],
  session: ["session"],
  setup: ["setup", "strategy", "strategie", "stratégie"],
  emotion: ["emotion", "émotion"],
  notes: ["notes", "note", "comment"],
  plan_respected: ["plan respected", "plan respecte", "plan respecté"],
  entry_time: ["heure entree", "heure d'entrée", "date/heure entrée", "entry_time", "entry time", "entrytime", "entry date time", "opening time", "open time"],
  exit_time: ["exit time", "exittime", "closing time", "closingtime", "exit date time", "heure sortie", "heure de sortie", "date/heure sortie", "exit_time"],
  size: ["size", "quantity", "qty", "trade quantity", "volumeinunits", "volume in units", "quantite", "quantité", "lots", "volume", "amount"],
  commission: ["commission", "commissions"],
  fees: ["fee", "fees", "frais"],
  swap: ["swap", "swaps", "financing", "financement"],
  currency: ["currency", "provider_currency", "devise", "account currency"],
  external_trade_id: ["id", "trade id", "tradeid", "trade number", "positionid", "position id", "external id", "external_trade_id", "ticket", "order id", "position", "deal"],
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

const csvRecords = text => {
  const records = [];
  let value = "", quoted = false, line = 1, startLine = 1;
  const source = String(text || "").replace(/^\uFEFF/, "");
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (char === '"') {
      value += char;
      if (quoted && source[index + 1] === '"') { value += '"'; index += 1; }
      else quoted = !quoted;
    } else if (char === "\n") {
      if (quoted) value += "\n";
      else { if (value.trim()) records.push({ value: value.replace(/\r$/, ""), rowNumber: startLine }); value = ""; startLine = line + 1; }
      line += 1;
    } else value += char;
  }
  if (quoted) throw new Error("Une cellule CSV entre guillemets n’est pas terminée.");
  if (value.trim()) records.push({ value: value.replace(/\r$/, ""), rowNumber: startLine });
  return records;
};

export const parseCsv = (text) => {
  const lines = csvRecords(text);
  if (lines.length < 2) throw new Error("Le fichier CSV doit contenir un en-tête et au moins une ligne.");
  const delimiter = detectDelimiter(lines[0].value);
  const headers = splitCsvLine(lines[0].value, delimiter).map(canonical);
  const mappedHeaders = headers.map(header => Object.entries(HEADER_ALIASES).find(([, aliases]) => aliases.includes(header))?.[0] || header);
  if (mappedHeaders.some((header, index) => mappedHeaders.indexOf(header) !== index)) throw new Error("Plusieurs colonnes désignent le même champ : utilise des en-têtes distincts.");
  return lines.slice(1).map(({ value, rowNumber }) => {
    const cells = splitCsvLine(value, delimiter);
    if (cells.length !== headers.length) throw new Error(`Ligne ${rowNumber} : ${cells.length} cellules pour ${headers.length} colonnes.`);
    return { rowNumber, raw: Object.fromEntries(mappedHeaders.map((header, cellIndex) => [header, cells[cellIndex] ?? ""])) };
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
  if (String(value ?? "").trim() === "") return null;
  let cleaned = String(value).trim().replace(/[−–—]/g, "-");
  const negative = /^\(.*\)$/.test(cleaned);
  cleaned = cleaned.replace(/(?:USD|EUR|GBP|CHF|JPY|CAD|AUD|\$US)/gi, "").replace(/[()$€£¥\s]/g, "").replace(/'/g, "");
  if (!/^[+-]?\d[\d,.]*$/.test(cleaned)) return NaN;
  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  if (lastComma > -1 && lastDot > -1) {
    cleaned = lastComma > lastDot
      ? cleaned.replace(/\./g, "").replace(",", ".")
      : cleaned.replace(/,/g, "");
  } else if (lastComma > -1) {
    // A single comma is a decimal separator, including five-digit FX prices.
    cleaned = (cleaned.match(/,/g) || []).length === 1 ? cleaned.replace(",", ".") : cleaned.replace(/,/g, "");
  }
  const number = Number(cleaned) * (negative ? -1 : 1);
  return Number.isFinite(number) ? number : NaN;
};

const parseDate = (value, dateOrder = "dmy") => {
  const source = String(value || "").trim();
  if (!source) return null;
  const french = source.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})(?:\s|$)/);
  const validKey = (year, month, day) => {
    const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    return date.getUTCFullYear() === Number(year) && date.getUTCMonth() === Number(month) - 1 && date.getUTCDate() === Number(day)
      ? `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}` : null;
  };
  if (french) return dateOrder === "mdy" ? validKey(french[3], french[1], french[2]) : validKey(french[3], french[2], french[1]);
  const metaTrader = source.match(/^(\d{4})[.\/-](\d{1,2})[.\/-](\d{1,2})(?:[T\s]|$)/);
  if (metaTrader) return validKey(metaTrader[1], metaTrader[2], metaTrader[3]);
  const parsed = new Date(source);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
};

const normalizeDirection = (value) => {
  const key = canonical(value);
  if (["long", "buy", "achat", "achat (long)", "b"].includes(key)) return "long";
  if (["short", "sell", "vente", "vente (short)", "s"].includes(key)) return "short";
  return null;
};

const normalizeStatus = (value, pnl, exitPrice) => {
  const key = canonical(value);
  if (["open", "ouvert", "ouverte"].includes(key)) return "open";
  if (["cancelled", "canceled", "annule", "annulé"].includes(key)) return "cancelled";
  if (["partial", "partiel", "partielle"].includes(key)) return "partial";
  if (pnl === null && (exitPrice !== null || ["closed", "cloture", "clôturé", "clôturée", "winner", "loser", "breakeven"].includes(key))) return "closed";
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

const identityTime = (value, date) => {
  const source = String(value || "").trim();
  if (!source || source === date) return "";
  const time = source.match(/(?:^|[ T])(\d{1,2}:\d{2})(?::(\d{2}))?/);
  return time ? `${time[1].padStart(5, "0")}:${time[2] || "00"}` : source;
};
export const tradeFingerprint = trade => trade.external_trade_id
  ? ["id", trade.account_id, String(trade.external_trade_id).trim()].join("|")
  : ["fields", trade.account_id, String(trade.date || "").slice(0, 10), canonical(trade.instrument), normalizeDirection(trade.direction) || canonical(trade.direction),
    identityTime(trade.entry_time, trade.date), identityTime(trade.exit_time, trade.date), trade.size ?? "", trade.entry ?? "", trade.exit_price ?? "", trade.pnl ?? ""].join("|");

export const tradeIdentityKeys = trade => [...new Set([
  tradeFingerprint(trade), trade.import_fingerprint,
  trade.id ? ["id", trade.account_id, String(trade.id).trim()].join("|") : null,
].filter(Boolean))];
export const isDuplicateTradeImport = (trade, knownKeys) => tradeIdentityKeys(trade).some(key => knownKeys.has(key));

const prepareRows = ({ rows, accounts = [], existingTrades = [], importSource = "csv", pnlMode = "auto", dateOrder = "dmy" }) => {
  const existing = new Set(existingTrades.flatMap(tradeIdentityKeys));
  const seen = new Set();
  return rows.map(({ rowNumber, raw }) => {
    const errors = [];
    const warnings = [];
    const matchingAccounts = raw.account_id ? accounts.filter(account => String(account.id) === String(raw.account_id).trim()) : findAccounts(raw.account, accounts);
    const account = matchingAccounts.length === 1 ? matchingAccounts[0] : null;
    const date = parseDate(raw.date || raw.entry_time, dateOrder);
    const direction = normalizeDirection(raw.direction);
    const parsedNumbers = Object.fromEntries(["entry", "exit_price", "stop", "take_profit", "pnl", "gross_pnl", "ambiguous_pnl", "size", "commission", "fees", "swap"].map(key => [key, parseNumber(raw[key])]));
    const numericFields = Object.fromEntries(["entry", "exit_price", "stop", "take_profit", "pnl", "size", "commission"].map(key => [key, parsedNumbers[key]]));
    // Store monetary costs as positive expenses, as required by the manual form.
    // Net results supplied by a file are not charged these expenses again.
    if (parsedNumbers.commission !== null || parsedNumbers.fees !== null) numericFields.commission = Math.abs(parsedNumbers.commission ?? 0) + Math.abs(parsedNumbers.fees ?? 0);
    if (numericFields.pnl === null) {
      const ambiguous = parsedNumbers.ambiguous_pnl;
      const gross = parsedNumbers.gross_pnl ?? (pnlMode === "gross" || (pnlMode === "auto" && importSource === "metatrader_html") ? ambiguous : null);
      if (gross !== null) {
        if (parsedNumbers.commission === null || parsedNumbers.swap === null) errors.push("P&L brut : renseigne Commission et Swap (0 si aucun)");
        else numericFields.pnl = gross - Math.abs(parsedNumbers.commission) - Math.abs(parsedNumbers.fees ?? 0) + parsedNumbers.swap;
      } else if (ambiguous !== null) {
        if (pnlMode === "net") numericFields.pnl = ambiguous;
        else errors.push("Précise si la colonne Profit est nette ou brute");
      }
    }
    if (matchingAccounts.length > 1) errors.push("Compte ambigu : utilise son nom ou son ID");
    else if (!account) errors.push("Compte introuvable");
    if (!date) errors.push("Date invalide");
    if (!String(raw.instrument || "").trim()) errors.push("Instrument manquant");
    if (!direction) errors.push("Direction invalide");
    Object.entries(parsedNumbers).forEach(([key, value]) => { if (Number.isNaN(value)) errors.push(`${key} invalide`); });
    const currency = String(raw.currency || account?.currency || "USD").trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) errors.push("Devise invalide (code ISO, par exemple USD)");
    if (raw.currency && account?.currency && currency !== String(account.currency).toUpperCase()) errors.push("La devise du fichier ne correspond pas au compte");
    const trade = {
      account_id: account?.id,
      date,
      instrument: String(raw.instrument || "").trim().toUpperCase(),
      direction,
      ...numericFields,
      provider_currency: currency,
      result_status: normalizeStatus(raw.result_status, numericFields.pnl, numericFields.exit_price),
      market_type: canonical(raw.market_type) || account?.market_type || null,
      setup: String(raw.setup || "").trim() || null,
      session: String(raw.session || "").trim() || null,
      emotion: String(raw.emotion || "").trim() || null,
      notes: String(raw.notes || "").trim() || null,
      plan_respected: normalizeBoolean(raw.plan_respected),
      entry_time: String(raw.entry_time || raw.date || "").trim() || null,
      exit_time: String(raw.exit_time || "").trim() || null,
      external_trade_id: String(raw.external_trade_id || "").trim() || null,
      import_source: importSource,
    };
    const fingerprint = tradeFingerprint(trade);
    trade.import_fingerprint = fingerprint;
    const duplicate = isDuplicateTradeImport(trade, existing) || isDuplicateTradeImport(trade, seen);
    if (duplicate) warnings.push("Doublon ignoré");
    if (!errors.length) tradeIdentityKeys(trade).forEach(key => seen.add(key));
    return { rowNumber, raw, trade, errors, warnings, duplicate, valid: errors.length === 0 && !duplicate };
  });
};

export const prepareTradeImport = ({ text, accounts = [], existingTrades = [], pnlMode = "auto", dateOrder = "dmy" }) => prepareRows({
  rows: parseCsv(text), accounts, existingTrades, importSource: "csv", pnlMode, dateOrder,
});

export const prepareTradeFileImport = ({ text, fileName = "", accounts = [], existingTrades = [], pnlMode = "auto", dateOrder = "dmy" }) => {
  const html = /\.html?$/i.test(fileName) || /^\s*(?:<!doctype\s+html|<html|<table)/i.test(String(text || ""));
  return prepareRows({
    rows: html ? parseMetaTraderHtml(text) : parseCsv(text),
    accounts,
    existingTrades,
    importSource: html ? "metatrader_html" : "csv",
    pnlMode,
    dateOrder,
  });
};
