const encodeUtf8 = (value) => {
  if (typeof TextEncoder !== "undefined") return new TextEncoder().encode(value);
  const encoded = unescape(encodeURIComponent(value));
  return Uint8Array.from(encoded, (character) => character.charCodeAt(0));
};

const serializeValue = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "Oui" : "Non";
  if (Array.isArray(value) || typeof value === "object") return JSON.stringify(value);
  if (typeof value === "string" && /^[=+\-@]/.test(value)) return `'${value}`;
  return String(value);
};

const csvCell = (value) => `"${serializeValue(value).replace(/"/g, '""')}"`;

export const EXPORT_SCHEMAS = Object.freeze({
  trades: [
    ["ID", "id"], ["Date", "date"], ["Compte ID", "account_id"], ["Compte", "account_name"],
    ["Prop firm", "account_firm"], ["Marché", "market_type"], ["Instrument", "instrument"],
    ["Direction", "direction"], ["Statut", "result_status"], ["Entrée", "entry"], ["Stop loss", "stop"],
    ["Take profit", "take_profit"], ["Sortie", "exit_price"], ["Taille", "size"], ["P&L", "pnl"],
    ["R multiple", "r"], ["Commission", "commission"], ["Date/heure entrée", "entry_time"],
    ["Date/heure sortie", "exit_time"], ["Durée", "duration"], ["Durée minutes", "duration_minutes"],
    ["Session", "session"], ["Setup", "setup"], ["Setups", "setups"], ["Émotion", "emotion"],
    ["Intensité émotion", "emotion_intensity"], ["Plan respecté", "plan_respected"],
    ["Favori", "starred"], ["Tags", "tags"], ["Erreurs", "mistakes"], ["Raison de sortie", "exit_reason"],
    ["Notes", "notes"], ["Check-list", "checklist_results"], ["Créé le", "created_at"], ["Modifié le", "updated_at"],
  ],
  accounts: [
    ["ID", "id"], ["Nom", "name"], ["Prop firm", "firm"], ["Marché", "market_type"], ["Statut", "status"],
    ["Solde initial", "initial_balance"], ["Solde actuel", "balance"], ["Objectif de profit", "profit_target"],
    ["Drawdown maximum", "max_drawdown"], ["Limite de perte quotidienne", "daily_loss_limit"],
    ["Drawdown actuel", "current_drawdown"], ["Créé le", "created_at"], ["Modifié le", "updated_at"],
  ],
  payouts: [
    ["ID", "id"], ["Date", "date"], ["Compte ID", "account_id"], ["Compte", "account_name"],
    ["Prop firm", "account_firm"], ["Montant", "amount"], ["Note", "note"],
    ["Créé le", "created_at"], ["Modifié le", "updated_at"],
  ],
  profile: [
    ["ID utilisateur", "id"], ["Email", "email"], ["Nom affiché", "name"], ["Type de trader", "trader_type"],
    ["Prop firms", "prop_firms"], ["Nombre de comptes", "num_accounts"],
    ["Onboarding terminé", "onboarding_completed"], ["Plan", "plan"], ["Statut abonnement", "subscription_status"],
    ["Créé le", "created_at"], ["Modifié le", "updated_at"],
  ],
  preferences: [
    ["Devise", "currency"], ["Fuseau horaire", "timezone"], ["Langue", "language"], ["Affichage compact", "compactMode"],
    ["Résumé quotidien", "daily"], ["Alertes de risque", "risk"], ["Objectifs de payout", "payout"],
    ["Nouveautés produit", "product"], ["Règles de trading", "rules"], ["Préférences du journal", "journal_preferences"],
  ],
  ai_reports: [
    ["ID", "id"], ["Question", "question"], ["Contexte", "tag"], ["Analyse", "answer"],
    ["Modèle", "model"], ["Créé le", "created_at"],
  ],
});

export function buildCsv(rows, schema) {
  const columns = schema || [];
  const header = columns.map(([label]) => csvCell(label)).join(";");
  const body = (rows || []).map((row) => columns.map(([, key]) => csvCell(row?.[key])).join(";")).join("\r\n");
  return `\uFEFF${header}${body ? `\r\n${body}` : ""}\r\n`;
}

const safeFilename = (value) => String(value || "export")
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase();

export const exportDateStamp = (date = new Date()) => date.toISOString().slice(0, 10);

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadCsv({ rows, type, filename }) {
  const schema = EXPORT_SCHEMAS[type];
  if (!schema) throw new Error(`Type d'export inconnu : ${type}`);
  const name = `${safeFilename(filename || `pipsevo-${type}`)}-${exportDateStamp()}.csv`;
  downloadBlob(new Blob([buildCsv(rows, schema)], { type: "text/csv;charset=utf-8" }), name);
  return name;
}

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) value = (value & 1) ? (0xEDB88320 ^ (value >>> 1)) : (value >>> 1);
  return value >>> 0;
});

const crc32 = (bytes) => {
  let crc = 0xFFFFFFFF;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
};

const u16 = (value) => new Uint8Array([value & 0xFF, (value >>> 8) & 0xFF]);
const u32 = (value) => new Uint8Array([value & 0xFF, (value >>> 8) & 0xFF, (value >>> 16) & 0xFF, (value >>> 24) & 0xFF]);
const joinBytes = (parts) => {
  const output = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  parts.forEach((part) => { output.set(part, offset); offset += part.length; });
  return output;
};

export function buildZip(files) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  files.forEach(({ name, content }) => {
    const nameBytes = encodeUtf8(name);
    const data = typeof content === "string" ? encodeUtf8(content) : content;
    const checksum = crc32(data);
    const localHeader = joinBytes([u32(0x04034B50), u16(20), u16(0x0800), u16(0), u16(0), u16(0), u32(checksum), u32(data.length), u32(data.length), u16(nameBytes.length), u16(0), nameBytes]);
    const centralHeader = joinBytes([u32(0x02014B50), u16(20), u16(20), u16(0x0800), u16(0), u16(0), u16(0), u32(checksum), u32(data.length), u32(data.length), u16(nameBytes.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), nameBytes]);
    localParts.push(localHeader, data);
    centralParts.push(centralHeader);
    offset += localHeader.length + data.length;
  });
  const central = joinBytes(centralParts);
  const end = joinBytes([u32(0x06054B50), u16(0), u16(0), u16(files.length), u16(files.length), u32(central.length), u32(offset), u16(0)]);
  return joinBytes([...localParts, central, end]);
}

export function buildFullExportFiles({ profile, accounts, trades, payouts, aiReports, settings }) {
  const accountById = Object.fromEntries((accounts || []).map((account) => [account.id, account]));
  const enrich = (rows) => (rows || []).map((row) => ({
    ...row,
    account_name: accountById[row.account_id]?.name || "",
    account_firm: accountById[row.account_id]?.firm || "",
  }));
  const preferences = {
    ...(settings || {}),
    rules: profile?.rules || {},
    journal_preferences: profile?.journal_preferences || {},
  };
  return [
    { name: "profil.csv", content: buildCsv(profile ? [profile] : [], EXPORT_SCHEMAS.profile) },
    { name: "preferences.csv", content: buildCsv([preferences], EXPORT_SCHEMAS.preferences) },
    { name: "comptes.csv", content: buildCsv(accounts || [], EXPORT_SCHEMAS.accounts) },
    { name: "trades.csv", content: buildCsv(enrich(trades), EXPORT_SCHEMAS.trades) },
    { name: "payouts.csv", content: buildCsv(enrich(payouts), EXPORT_SCHEMAS.payouts) },
    { name: "analyses-atlas.csv", content: buildCsv(aiReports || [], EXPORT_SCHEMAS.ai_reports) },
  ];
}

export function downloadFullDataExport(data) {
  const archive = buildZip(buildFullExportFiles(data));
  const filename = `pipsevo-mes-donnees-${exportDateStamp()}.zip`;
  downloadBlob(new Blob([archive], { type: "application/zip" }), filename);
  return filename;
}
