import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { downloadCsv } from "@/lib/dataExport";

export default function CsvExportButton({ rows, type, filename, label = "Exporter CSV", className = "btn-ghost" }) {
  const [exporting, setExporting] = useState(false);
  const empty = !rows?.length;

  const handleExport = async () => {
    if (empty || exporting) return;
    setExporting(true);
    try {
      await new Promise((resolve) => window.setTimeout(resolve, 0));
      const savedAs = downloadCsv({ rows, type, filename });
      toast.success(`Export créé : ${savedAs}`);
    } catch (error) {
      toast.error(error.message || "Impossible de créer l’export CSV");
    } finally {
      setExporting(false);
    }
  };

  return <button
    type="button"
    onClick={handleExport}
    disabled={empty || exporting}
    title={empty ? "Aucune donnée à exporter" : `Télécharger ${label.toLowerCase()}`}
    className={`${className} inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-45`}
  >
    <Download className="h-4 w-4"/>
    {exporting ? "Préparation…" : label}
  </button>;
}
