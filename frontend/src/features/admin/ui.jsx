import React, { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, LoaderCircle, RefreshCw } from "lucide-react";
import { apiErrorMessage } from "../../lib/apiError";

export const formatDate = (value) => value && Number.isFinite(new Date(value).getTime()) ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";
export const formatNumber = (value) => new Intl.NumberFormat("fr-FR").format(Number(value || 0));
export const extractError = apiErrorMessage;
export const confirmAction = (message) => window.confirm(message);

export function useAdminData(loader, dependencies = []) {
  const [state, setState] = useState({ loading: true, data: null, error: "" });
  const sequence = useRef(0);
  const load = useCallback(async () => {
    const current = ++sequence.current;
    setState({ loading: true, data: null, error: "" });
    try {
      const result = await loader();
      if (current === sequence.current) setState({ loading: false, data: result.data, error: "" });
    } catch (error) {
      if (current === sequence.current) setState({ loading: false, data: null, error: extractError(error) });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);
  useEffect(() => { load(); return () => { sequence.current += 1; }; }, [load]);
  return { ...state, reload: load };
}

export function Page({ eyebrow, title, description, actions, children }) {
  return <div className="admin-page"><div className="admin-page-head"><div><span className="admin-eyebrow">{eyebrow}</span><h1>{title}</h1>{description && <p>{description}</p>}</div>{actions && <div className="admin-head-actions">{actions}</div>}</div>{children}</div>;
}

export function LoadState({ loading, error, reload }) {
  if (loading) return <div className="admin-state"><LoaderCircle className="spin" /> Chargement des données réelles…</div>;
  if (error) return <div className="admin-state error"><AlertCircle /><div><strong>Chargement impossible</strong><span>{error}</span></div><button onClick={reload}><RefreshCw /> Réessayer</button></div>;
  return null;
}

export function Metric({ label, value, hint, tone = "violet" }) {
  return <article className={`admin-metric tone-${tone}`}><span>{label}</span><strong>{value ?? "—"}</strong>{hint && <small>{hint}</small>}</article>;
}

export function Status({ value }) {
  const normalized = String(value || "unknown").toLowerCase();
  return <span className={`admin-status status-${normalized.replaceAll("_", "-")}`}>{String(value || "inconnu").replaceAll("_", " ")}</span>;
}

export function Empty({ children = "Aucune donnée réelle pour cette période." }) {
  return <div className="admin-empty">{children}</div>;
}

export function RefreshButton({ onClick }) {
  return <button className="admin-button secondary" onClick={onClick}><RefreshCw /> Actualiser</button>;
}

export function Pagination({ page, pages, onChange }) {
  if (!pages || pages <= 1) return null;
  return <div className="admin-pagination"><button disabled={page <= 1} onClick={() => onChange(page - 1)}>Précédent</button><span>Page {page} / {pages}</span><button disabled={page >= pages} onClick={() => onChange(page + 1)}>Suivant</button></div>;
}
