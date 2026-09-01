import React, { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Download, ExternalLink, RotateCcw, Search, SlidersHorizontal, Star, Upload } from "lucide-react";
import { toast } from "sonner";

const STORAGE_KEY = "pipsevo.economic-calendar.preferences.v1";
const EVENTS_KEY = "pipsevo.economic-calendar.events.v1";
const CURRENCIES = [
  ["1", "AUD"], ["2", "CAD"], ["3", "CHF"], ["4", "CNY"], ["5", "EUR"],
  ["6", "GBP"], ["7", "JPY"], ["8", "NZD"], ["9", "USD"],
];
const IMPACTS = [
  ["3", "Fort", "bg-[#FF5252]"],
  ["2", "Moyen", "bg-[#FFB020]"],
  ["1", "Faible", "bg-[#FFD166]"],
  ["0", "Non économique", "bg-[#6F7785]"],
];
const DEFAULTS = { currencies: CURRENCIES.map(([id]) => id), impacts: ["3", "2"] };

function readPreferences() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
    return {
      currencies: Array.isArray(saved?.currencies) ? saved.currencies : DEFAULTS.currencies,
      impacts: Array.isArray(saved?.impacts) ? saved.impacts : DEFAULTS.impacts,
    };
  } catch {
    return DEFAULTS;
  }
}

function readEvents() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(EVENTS_KEY));
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function normalizeImpact(value = "") {
  const impact = String(value).toLowerCase();
  if (impact.includes("high")) return "3";
  if (impact.includes("medium") || impact.includes("med")) return "2";
  if (impact.includes("low")) return "1";
  return "0";
}

function normalizeEvents(rows) {
  return rows.map((row, index) => {
    const date = new Date(row.date || row.datetime || row.time || "");
    if (!row.title || Number.isNaN(date.getTime())) return null;
    return {
      id: `${date.toISOString()}-${row.country || row.currency || "ALL"}-${row.title}-${index}`,
      title: String(row.title),
      currency: String(row.country || row.currency || "ALL").toUpperCase(),
      impact: normalizeImpact(row.impact),
      date: date.toISOString(),
      actual: row.actual ?? "",
      forecast: row.forecast ?? "",
      previous: row.previous ?? "",
      favorite: false,
    };
  }).filter(Boolean).sort((a, b) => new Date(a.date) - new Date(b.date));
}

const IMPACT_META = {
  "3": { label: "Fort", dot: "bg-[#FF5252]", text: "text-[#FF6B76]" },
  "2": { label: "Moyen", dot: "bg-[#FFB020]", text: "text-[#FFB84D]" },
  "1": { label: "Faible", dot: "bg-[#FFD166]", text: "text-[#FFD166]" },
  "0": { label: "Info", dot: "bg-[#6F7785]", text: "text-[#8B93A1]" },
};

function Toggle({ active, onClick, children, ariaLabel }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={ariaLabel}
      onClick={onClick}
      className={`min-h-9 rounded-xl border px-3 text-[11px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C4DFF]/70 ${
        active
          ? "border-[#7C4DFF]/55 bg-[#7C4DFF]/15 text-white"
          : "border-white/[0.07] bg-white/[0.025] text-[#727A89] hover:border-white/[0.14] hover:text-[#B9BFCA]"
      }`}
    >
      {children}
    </button>
  );
}

export default function EconomicCalendar() {
  const [preferences, setPreferences] = useState(readPreferences);
  const [events, setEvents] = useState(readEvents);
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  }, [preferences]);

  useEffect(() => {
    window.localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
  }, [events]);

  const visibleEvents = useMemo(() => events.filter(event => {
    const currencyId = CURRENCIES.find(([, code]) => code === event.currency)?.[0];
    const matchesCurrency = event.currency === "ALL" || (currencyId && preferences.currencies.includes(currencyId));
    const matchesImpact = preferences.impacts.includes(event.impact);
    const matchesSearch = !query.trim() || `${event.title} ${event.currency}`.toLowerCase().includes(query.trim().toLowerCase());
    return matchesCurrency && matchesImpact && matchesSearch;
  }), [events, preferences, query]);

  const groupedEvents = useMemo(() => visibleEvents.reduce((groups, event) => {
    const key = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(new Date(event.date));
    (groups[key] ||= []).push(event);
    return groups;
  }, {}), [visibleEvents]);

  const toggle = (group, id) => {
    setPreferences(current => {
      const values = current[group];
      const next = values.includes(id) ? values.filter(value => value !== id) : [...values, id];
      return { ...current, [group]: next };
    });
  };

  const reset = () => {
    setPreferences(DEFAULTS);
    setQuery("");
  };

  const importFile = async event => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 2_000_000) return toast.error("Le fichier dépasse la limite de 2 Mo.");
    try {
      const parsed = JSON.parse(await file.text());
      if (!Array.isArray(parsed)) throw new Error("format");
      const normalized = normalizeEvents(parsed.slice(0, 2000));
      if (!normalized.length) throw new Error("empty");
      setEvents(normalized);
      toast.success(`${normalized.length} événements importés.`);
    } catch {
      toast.error("Export JSON non reconnu. Télécharge l’export hebdomadaire Forex Factory.");
    }
  };

  const toggleFavorite = id => setEvents(current => current.map(event => event.id === id ? { ...event, favorite: !event.favorite } : event));

  return (
    <div className="pe-page pe-page-stack mx-auto max-w-[1800px]">
      <div className="pe-page-header">
        <div>
          <div className="pe-eyebrow">Agenda macroéconomique</div>
          <h1 className="pe-page-title mt-2 flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-[#B58BFF]" /> Calendrier économique
          </h1>
          <p className="pe-page-copy mt-1">Repère les annonces importantes avant de préparer ton trade.</p>
        </div>
        <a
          href="https://www.forexfactory.com/calendar"
          target="_blank"
          rel="noreferrer"
          className="btn-ghost inline-flex items-center justify-center gap-2 text-sm"
        >
          Ouvrir Forex Factory <ExternalLink className="h-4 w-4" />
        </a>
      </div>

      <section className="overflow-hidden rounded-[22px] border border-white/[0.08] bg-[#0B0E16]">
        <div className="border-b border-white/[0.07] p-4 sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-xl">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <SlidersHorizontal className="h-4 w-4 text-[#8C73FF]" /> Personnaliser l'affichage
              </div>
              <p className="mt-1 text-xs leading-5 text-[#737B8A]">Tes filtres, favoris et événements importés restent uniquement sur cet appareil.</p>
            </div>
            <button type="button" onClick={reset} className="inline-flex items-center gap-2 self-start text-xs text-[#8D95A3] transition hover:text-white">
              <RotateCcw className="h-3.5 w-3.5" /> Réinitialiser
            </button>
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_auto]">
            <div>
              <div className="mb-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#626A79]">Devises suivies</div>
              <div className="flex flex-wrap gap-2">
                {CURRENCIES.map(([id, code]) => (
                  <Toggle key={id} active={preferences.currencies.includes(id)} onClick={() => toggle("currencies", id)} ariaLabel={`${code} ${preferences.currencies.includes(id) ? "activée" : "désactivée"}`}>
                    {code}
                  </Toggle>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#626A79]">Impact attendu</div>
              <div className="flex flex-wrap gap-2">
                {IMPACTS.map(([id, label, color]) => (
                  <Toggle key={id} active={preferences.impacts.includes(id)} onClick={() => toggle("impacts", id)} ariaLabel={`Impact ${label}`}>
                    <span className="inline-flex items-center gap-2"><span className={`h-1.5 w-1.5 rounded-full ${color}`} />{label}</span>
                  </Toggle>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="border-b border-white/[0.07] p-4 sm:p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative max-w-md flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#626A79]" />
              <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Rechercher une annonce ou une devise…" className="pe-control w-full pl-10 text-xs" />
            </div>
            <div className="flex flex-wrap gap-2">
              <a href="https://nfs.faireconomy.media/ff_calendar_thisweek.json" target="_blank" rel="noreferrer" className="btn-ghost inline-flex min-h-10 items-center gap-2 px-3 text-xs">
                <Download className="h-4 w-4" /> Télécharger l'export officiel
              </a>
              <button type="button" onClick={() => inputRef.current?.click()} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#7147FF] px-3 text-xs font-semibold text-white transition hover:bg-[#805CFF]">
                <Upload className="h-4 w-4" /> Importer le JSON
              </button>
              <input ref={inputRef} type="file" accept="application/json,.json" onChange={importFile} className="hidden" />
            </div>
          </div>
        </div>

        {preferences.currencies.length === 0 || preferences.impacts.length === 0 ? (
          <div className="grid min-h-[420px] place-items-center px-6 text-center">
            <div>
              <CalendarDays className="mx-auto h-8 w-8 text-[#544A72]" />
              <p className="mt-3 text-sm font-semibold text-white">Sélection incomplète</p>
              <p className="mt-1 text-xs text-[#747C8B]">Active au moins une devise et un niveau d'impact.</p>
            </div>
          </div>
        ) : visibleEvents.length ? (
          <div className="min-h-[420px] divide-y divide-white/[0.07]">
            {Object.entries(groupedEvents).map(([date, dayEvents]) => (
              <section key={date} className="grid md:grid-cols-[190px_1fr]">
                <div className="border-b border-white/[0.06] bg-white/[0.015] px-4 py-4 text-xs font-semibold capitalize text-[#AEB5C1] md:border-b-0 md:border-r md:px-5">{date}</div>
                <div className="divide-y divide-white/[0.06]">
                  {dayEvents.map(event => {
                    const impact = IMPACT_META[event.impact];
                    return (
                      <article key={event.id} className="grid gap-3 px-4 py-4 sm:grid-cols-[70px_54px_minmax(180px,1fr)_repeat(3,minmax(64px,90px))_32px] sm:items-center sm:px-5">
                        <time className="text-sm font-semibold tabular-nums text-white">{new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(new Date(event.date))}</time>
                        <span className="w-fit rounded-lg border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-[10px] font-bold text-[#D7DBE2]">{event.currency}</span>
                        <div><div className="text-sm font-medium text-[#E4E7EC]">{event.title}</div><div className={`mt-1 flex items-center gap-1.5 text-[10px] ${impact.text}`}><span className={`h-1.5 w-1.5 rounded-full ${impact.dot}`} />Impact {impact.label.toLowerCase()}</div></div>
                        {[['Réel', event.actual], ['Prévu', event.forecast], ['Préc.', event.previous]].map(([label, value]) => <div key={label} className="flex items-center justify-between gap-2 sm:block"><span className="text-[9px] uppercase tracking-[.12em] text-[#5F6775]">{label}</span><div className="mt-0.5 text-xs font-medium tabular-nums text-[#B9C0CB]">{value || "—"}</div></div>)}
                        <button type="button" onClick={() => toggleFavorite(event.id)} aria-label={event.favorite ? "Retirer des favoris" : "Ajouter aux favoris"} className={`grid h-8 w-8 place-items-center rounded-lg transition ${event.favorite ? "bg-[#7C4DFF]/15 text-[#B58BFF]" : "text-[#535B69] hover:bg-white/[0.04] hover:text-white"}`}><Star className={`h-4 w-4 ${event.favorite ? "fill-current" : ""}`} /></button>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="grid min-h-[420px] place-items-center px-6 text-center">
            <div className="max-w-md">
              <CalendarDays className="mx-auto h-9 w-9 text-[#65548B]" />
              <p className="mt-4 text-sm font-semibold text-white">{events.length ? "Aucun événement ne correspond aux filtres" : "Importe la semaine économique"}</p>
              <p className="mt-2 text-xs leading-5 text-[#747C8B]">{events.length ? "Modifie les devises, les impacts ou la recherche." : "Télécharge l’export JSON officiel, puis importe-le ici. Les données ne quittent pas ton navigateur."}</p>
              {!events.length && <div className="mt-5 flex flex-wrap justify-center gap-2"><a href="https://nfs.faireconomy.media/ff_calendar_thisweek.json" target="_blank" rel="noreferrer" className="btn-ghost inline-flex items-center gap-2 text-xs"><Download className="h-4 w-4"/>1. Télécharger</a><button type="button" onClick={() => inputRef.current?.click()} className="inline-flex items-center gap-2 rounded-xl bg-[#7147FF] px-4 py-2.5 text-xs font-semibold text-white"><Upload className="h-4 w-4"/>2. Importer</button></div>}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-1 border-t border-white/[0.07] px-4 py-3 text-[10px] leading-4 text-[#626A79] sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <span>Format compatible avec l’export hebdomadaire Forex Factory.</span>
          <span>Les horaires sont approximatifs et peuvent changer.</span>
        </div>
      </section>
    </div>
  );
}
