export function atlasReportPresentation(report = {}) {
  const model = String(report.model || "");
  if (/deterministic|rules?-based|local/i.test(model)) return {
    label: "Analyse locale par règles",
    description: "Calculs et conseils déterministes à partir de ton journal, sans modèle génératif externe pour ce rapport.",
  };
  if (model) return { label: "Analyse générative externe", description: `Modèle déclaré par le serveur : ${model}. Ce rapport reste un coaching, pas un signal de trading.` };
  return { label: "Origine du rapport non précisée", description: "Ce rapport historique ne fournit pas l’origine de son moteur d’analyse." };
}
