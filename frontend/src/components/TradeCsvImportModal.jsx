import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, FileUp, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";
import { trades as tradesAPI } from "@/lib/api";
import { prepareTradeFileImport } from "@/lib/tradeCsvImport";

export default function TradeCsvImportModal({ accounts, existingTrades, onClose, onImported }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [rows, setRows] = useState([]);
  const [readingError, setReadingError] = useState("");
  const [importing, setImporting] = useState(false);
  const [lastBatch, setLastBatch] = useState(null);

  useEffect(() => {
    const onKeyDown = event => { if (event.key === "Escape" && !importing) onClose(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [importing, onClose]);

  const summary = useMemo(() => ({
    valid: rows.filter(row => row.valid).length,
    duplicate: rows.filter(row => row.duplicate).length,
    error: rows.filter(row => row.errors.length > 0).length,
  }), [rows]);

  const selectFile = async event => {
    const nextFile = event.target.files?.[0];
    if (!nextFile) return;
    setReadingError(""); setLastBatch(null); setFile(nextFile);
    try {
      const text = await nextFile.text();
      setRows(prepareTradeFileImport({ text, fileName: nextFile.name, accounts, existingTrades }));
    } catch (error) {
      setRows([]);
      setReadingError(error.message || "Impossible de lire ce fichier.");
    }
  };

  const runImport = async () => {
    const validRows = rows.filter(row => row.valid).map(row => row.trade);
    if (!validRows.length) return;
    setImporting(true);
    try {
      const { data } = await tradesAPI.importCsv({
        fileName: file.name,
        rows: validRows,
        totalRows: rows.length,
        skippedRows: summary.duplicate,
        errorRows: summary.error,
      });
      setLastBatch(data.batch);
      toast.success(`${data.trades.length} trade${data.trades.length > 1 ? "s" : ""} importé${data.trades.length > 1 ? "s" : ""}`);
      await onImported();
    } catch (error) {
      toast.error(error.response?.data?.detail || error.message || "Import impossible");
    } finally { setImporting(false); }
  };

  const rollback = async () => {
    if (!lastBatch || !window.confirm("Supprimer tous les trades ajoutés par cet import ?")) return;
    setImporting(true);
    try {
      await tradesAPI.rollbackImport(lastBatch.id);
      setLastBatch(null); setRows([]); setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      toast.success("Import annulé");
      await onImported();
    } catch (error) { toast.error(error.response?.data?.detail || "Annulation impossible"); }
    finally { setImporting(false); }
  };

  return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm" onMouseDown={event => { if (event.target === event.currentTarget && !importing) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="csv-import-title" className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#090C15] shadow-2xl">
      <header className="flex items-start justify-between border-b border-white/[0.07] p-5 sm:p-6">
        <div><h2 id="csv-import-title" className="text-xl font-bold">Importer des trades</h2><p className="mt-1 text-xs text-[#8B93A3]">CSV, TXT tabulé ou rapport HTML MetaTrader, avec validation avant toute écriture.</p></div>
        <button type="button" onClick={onClose} disabled={importing} aria-label="Fermer" className="grid h-9 w-9 place-items-center rounded-xl text-[#8B93A3] hover:bg-white/5 hover:text-white disabled:opacity-40"><X className="h-4 w-4"/></button>
      </header>
      <div className="overflow-y-auto p-5 sm:p-6">
        <button type="button" onClick={() => inputRef.current?.click()} disabled={importing} className="flex w-full flex-col items-center justify-center rounded-2xl border border-dashed border-[#7C4DFF]/40 bg-[#7C4DFF]/[0.06] px-5 py-8 text-center hover:border-[#7C4DFF]/70 disabled:opacity-50">
          <FileUp className="h-7 w-7 text-[#B58BFF]"/><span className="mt-3 text-sm font-semibold">{file?.name || "Choisir un fichier CSV, TXT ou HTML"}</span><span className="mt-1 max-w-2xl text-xs leading-5 text-[#7E8798]">MetaTrader 4/5, cTrader, NinjaTrader 8, Quantower, Sierra Chart ou modèle CSV PipsEvo.</span>
        </button>
        <input ref={inputRef} type="file" accept=".csv,.txt,.html,.htm,text/csv,text/plain,text/html" className="sr-only" onChange={selectFile}/>
        {readingError && <div className="mt-4 rounded-xl border border-[#F26A70]/25 bg-[#F26A70]/10 p-3 text-sm text-[#FF8A8A]">{readingError}</div>}
        {rows.length > 0 && <>
          <div className="mt-5 grid grid-cols-3 gap-2">
            <Summary label="Prêts" value={summary.valid} color="#46C99A"/><Summary label="Doublons" value={summary.duplicate} color="#FFB855"/><Summary label="Erreurs" value={summary.error} color="#F26A70"/>
          </div>
          <div className="mt-5 overflow-x-auto rounded-xl border border-white/[0.07]">
            <table className="min-w-[720px] w-full text-left text-xs"><thead className="bg-white/[0.035] text-[#8B93A3]"><tr><th className="p-3">Ligne</th><th className="p-3">Compte</th><th className="p-3">Date</th><th className="p-3">Instrument</th><th className="p-3">Sens</th><th className="p-3">P&L</th><th className="p-3">État</th></tr></thead>
              <tbody>{rows.slice(0, 100).map(row => <tr key={row.rowNumber} className="border-t border-white/[0.05]"><td className="p-3 font-mono text-[#7E8798]">{row.rowNumber}</td><td className="p-3">{row.raw.account || "—"}</td><td className="p-3">{row.trade.date || "—"}</td><td className="p-3 font-semibold">{row.trade.instrument || "—"}</td><td className="p-3">{row.trade.direction || "—"}</td><td className="font-numeric p-3">{row.trade.pnl ?? "—"}</td><td className="p-3">{row.valid ? <span className="inline-flex items-center gap-1 text-[#46C99A]"><CheckCircle2 className="h-3.5 w-3.5"/>Prêt</span> : <span title={[...row.errors, ...row.warnings].join(" · ")} className={`inline-flex items-center gap-1 ${row.duplicate ? "text-[#FFB855]" : "text-[#F26A70]"}`}><AlertTriangle className="h-3.5 w-3.5"/>{row.duplicate ? "Doublon" : row.errors[0]}</span>}</td></tr>)}</tbody>
            </table>
          </div>
          {rows.length > 100 && <p className="mt-2 text-right text-[10px] text-[#7E8798]">Aperçu limité aux 100 premières lignes · toutes les lignes valides seront importées.</p>}
        </>}
      </div>
      <footer className="flex flex-col-reverse gap-2 border-t border-white/[0.07] bg-[#090C15]/95 p-4 backdrop-blur sm:flex-row sm:justify-end sm:px-6">
        {lastBatch ? <button type="button" onClick={rollback} disabled={importing} className="btn-ghost inline-flex items-center justify-center gap-2 text-sm text-[#FF8A8A]"><RotateCcw className="h-4 w-4"/>Annuler cet import</button> : <button type="button" onClick={onClose} disabled={importing} className="btn-ghost text-sm">Annuler</button>}
        <button type="button" onClick={runImport} disabled={importing || !summary.valid || Boolean(lastBatch)} className="btn-primary text-sm disabled:cursor-not-allowed disabled:opacity-45">{importing ? "Import en cours…" : `Importer ${summary.valid || ""} trade${summary.valid > 1 ? "s" : ""}`}</button>
      </footer>
    </section>
  </div>;
}

const Summary = ({ label, value, color }) => <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3"><div className="text-[10px] uppercase tracking-wider text-[#7E8798]">{label}</div><div className="mt-1 text-xl font-bold font-numeric" style={{ color }}>{value}</div></div>;
