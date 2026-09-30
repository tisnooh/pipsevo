export const createReadinessForm = (accountId = "") => ({
  account_id: accountId,
  instrument: "",
  setup: "",
  session: "",
  emotion: "",
  emotion_intensity: "medium",
  planned_risk_percent: "",
  entry: "",
  stop: "",
  take_profit: "",
});

const optionalNumber = (value) => {
  if (value === "" || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

export const buildReadinessPayload = (form, checklist, checks, localDate) => ({
  account_id: form.account_id,
  local_date: localDate,
  instrument: form.instrument.trim() || null,
  setup: form.setup.trim() || null,
  session: form.session.trim() || null,
  emotion: form.emotion.trim() || null,
  emotion_intensity: form.emotion_intensity || null,
  planned_risk_percent: optionalNumber(form.planned_risk_percent),
  entry: optionalNumber(form.entry),
  stop: optionalNumber(form.stop),
  take_profit: optionalNumber(form.take_profit),
  checklist_results: checklist
    .filter((item) => item.enabled !== false)
    .map((item) => ({ id: item.id, label: item.label, checked: Boolean(checks[item.id]), required: Boolean(item.required) })),
});

export const readinessPresentation = (status) => ({
  ready: { title: "Processus validé", color: "#46C99A" },
  caution: { title: "Prudence requise", color: "#FFB855" },
  blocked: { title: "Position à suspendre", color: "#F26A70" },
}[status] || { title: "Analyse du processus", color: "#B58BFF" });
