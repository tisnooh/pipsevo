import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock3, ExternalLink,
  RefreshCw, RotateCcw, Search, SlidersHorizontal, Star, Wifi, WifiOff,
} from "lucide-react";
import { toast } from "sonner";
import { economicCalendar } from "@/lib/api";

const STORAGE_KEY = "pipsevo.economic-calendar.preferences.v1";
const EVENTS_KEY = "pipsevo.economic-calendar.events.v2";
const FAVORITES_KEY = "pipsevo.economic-calendar.favorites.v1";
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
const IMPACT_META = {
  "3": { label: "Fort", dot: "bg-[#FF5252]", text: "text-[#FF6B76]" },
  "2": { label: "Moyen", dot: "bg-[#FFB020]", text: "text-[#FFB84D]" },
  "1": { label: "Faible", dot: "bg-[#FFD166]", text: "text-[#FFD166]" },
  "0": { label: "Info", dot: "bg-[#6F7785]", text: "text-[#8B93A1]" },
};

function readJson(key, fallback) {
  try {
    const value = JSON.parse(window.localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function readPreferences() {
  const saved = readJson(STORAGE_KEY, DEFAULTS);
  return {
    currencies: Array.isArray(saved?.currencies) ? saved.currencies : DEFAULTS.currencies,
    impacts: Array.isArray(saved?.impacts) ? saved.impacts : DEFAULTS.impacts,
  };
}

function localDayKey(value) {
  const parts = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(value));
  const get = type => parts.find(part => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function normalizeImpact(value = "") {
  const impact = String(value).toLowerCase();
  if (impact === "3" || impact.includes("high")) return "3";
  if (impact === "2" || impact.includes("medium") || impact.includes("med")) return "2";
  if (impact === "1" || impact.includes("low")) return "1";
  return "0";
}

function normalizeEvents(rows, favorites = []) {
  const favoriteIds = new Set(favorites);
  return (Array.isArray(rows) ? rows : []).map((row, index) => {
    const date = new Date(row.date || row.datetime || row.time || "");
    if (!row.title || Number.isNaN(date.getTime())) return null;
    const id = String(row.id || `${date.toISOString()}-${row.country || row.currency || "ALL"}-${row.title}-${index}`);
    return {
      id,
      title: String(row.title),
      currency: String(row.country || row.currency || "ALL").toUpperCase(),
      impact: normalizeImpact(row.impact),
      date: date.toISOString(),
      actual: row.actual ?? "",
      forecast: row.forecast ?? "",
      previous: row.previous ?? "",
      favorite: favoriteIds.has(id),
    };
  }).filter(Boolean).sort((a, b) => new Date(a.date) - new Date(b.date));
}

function getWeekDays(anchor = new Date()) {
  const monday = new Date(anchor);
  const weekday = (monday.getDay() + 6) % 7;
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - weekday);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return date;
  });
}

function Toggle({ active, onClick, children, ariaLabel }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={ariaLabel}
      onClick={onClick}
      className={`min-h-9 rounded-xl border px-3 text-[11px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C4DFF]/70 ${active ? "border-[#7C4DFF]/55 bg-[#7C4DFF]/15 text-white" : "border-white/[0.07] bg-white/[0.025] text-[#727A89] hover:border-white/[0.14] hover:text-[#B9BFCA]"}`}
    >
      {children}
    </button>
  );
}

export default function EconomicCalendar() {
  const todayKey = localDayKey(new Date());
  const [preferences, setPreferences] = useState(readPreferences);
  const [events, setEvents] = useState(() => normalizeEvents(readJson(EVENTS_KEY, []), readJson(FAVORITES_KEY, [])));
  const [favorites, setFavorites] = useState(() => readJson(FAVORITES_KEY, []));
  const [query, setQuery] = useState("");
  const [selectedDay, setSelectedDay] = useState(todayKey);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncError, setSyncError] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const weekDays = useMemo(() => getWeekDays(), []);
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Heure locale";

  useEffect(() => window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences)), [preferences]);
  useEffect(() => window.localStorage.setItem(EVENTS_KEY, JSON.stringify(events)), [events]);
  useEffect(() => window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites)), [favorites]);

  const synchronize = useCallback(async (force = false, notify = false) => {
    setRefreshing(true);
    try {
      const { data } = await economicCalendar.list(force);
      const favoriteIds = readJson(FAVORITES_KEY, []);
      const normalized = normalizeEvents(data?.events, favoriteIds);
      setEvents(normalized);
      setLastSync(data?.fetched_at || new Date().toISOString());
      setSyncError(Boolean(data?.stale));
      if (notify) toast.success(`${normalized.length} annonces économiques synchronisées.`);
    } catch {
      setSyncError(true);
      if (notify) toast.error("La source économique ne répond pas. Les dernières données disponibles restent affichées.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    synchronize();
    const interval = window.setInterval(() => synchronize(), 5 * 60 * 1000);
    const onVisibility = () => { if (document.visibilityState === "visible") synchronize(); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [synchronize]);

  const visibleEvents = useMemo(() => events.filter(event => {
    const currencyId = CURRENCIES.find(([, code]) => code === event.currency)?.[0];
    const matchesCurrency = event.currency === "ALL" || (currencyId && preferences.currencies.includes(currencyId));
    const matchesImpact = preferences.impacts.includes(event.impact);
    const matchesSearch = !query.trim() || `${event.title} ${event.currency}`.toLowerCase().includes(query.trim().toLowerCase());
    const matchesDay = selectedDay === "week" || localDayKey(event.date) === selectedDay;
    return matchesCurrency && matchesImpact && matchesSearch && matchesDay;
  }), [events, preferences, query, selectedDay]);

  const groupedEvents = useMemo(() => visibleEvents.reduce((groups, event) => {
    const key = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(new Date(event.date));
    (groups[key] ||= []).push(event);
    return groups;
  }, {}), [visibleEvents]);

  const toggle = (group, id) => setPreferences(current => {
    const values = current[group];
    return { ...current, [group]: values.includes(id) ? values.filter(value => value !== id) : [...values, id] };
  });
  const reset = () => { setPreferences(DEFAULTS); setQuery(""); setSelectedDay(todayKey); };
  const toggleFavorite = id => {
    setFavorites(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id]);
    setEvents(current => current.map(event => event.id === id ? { ...event, favorite: !event.favorite } : event));
  };
  const selectedIndex = weekDays.findIndex(day => localDayKey(day) === selectedDay);
  const moveDay = direction => {
    if (selectedDay === "week") return setSelectedDay(todayKey);
    const next = Math.max(0, Math.min(6, selectedIndex + direction));
    setSelectedDay(localDayKey(weekDays[next]));
  };

  return (
    <div className="pe-page pe-page-stack mx-auto max-w-[1800px]">
      <div className="pe-page-header">
        <div>
          <div className="pe-eyebrow">Agenda macroéconomique</div>
          <h1 className="pe-page-title mt-2 flex items-center gap-2"><CalendarDays className="h-6 w-6 text-[#B58BFF]" /> Calendrier économique</h1>
          <p className="pe-page-copy mt-1">Les annonces de la semaine, synchronisées automatiquement dans ton heure locale.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => synchronize(true, true)} disabled={refreshing} className="btn-ghost inline-flex items-center justify-center gap-2 text-sm disabled:opacity-60"><RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> Actualiser</button>
          <a href="https://www.forexfactory.com/calendar" target="_blank" rel="noreferrer" className="btn-ghost inline-flex items-center justify-center gap-2 text-sm">Voir la source <ExternalLink className="h-4 w-4" /></a>
        </div>
      </div>

      <section className="pe-card overflow-hidden">
        <div className="border-b border-white/[0.07] px-4 py-3 sm:px-5">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[10px] text-[#7A8290]">
            <span className={`inline-flex items-center gap-1.5 font-semibold ${syncError ? "text-[#FFB84D]" : "text-[#35D6A0]"}`}>{syncError ? <WifiOff className="h-3.5 w-3.5" /> : <Wifi className="h-3.5 w-3.5" />}{syncError ? "Dernières données disponibles" : "Synchronisation active"}</span>
            <span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" /> {timeZone}</span>
            <span>Source : Forex Factory</span>
            <span>{lastSync ? `Mis à jour à ${new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(new Date(lastSync))}` : "Connexion en cours…"}</span>
          </div>
        </div>

        <div className="border-b border-white/[0.07] p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <button type="button" onClick={() => moveDay(-1)} disabled={selectedDay !== "week" && selectedIndex <= 0} aria-label="Jour précédent" className="grid h-9 w-9 place-items-center rounded-xl border border-white/[0.07] text-[#8D95A3] transition hover:text-white disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>
            <div className="text-center"><div className="text-sm font-semibold text-white">Cette semaine</div><div className="mt-0.5 text-[10px] text-[#6F7785]">{events.length} annonces reçues</div></div>
            <button type="button" onClick={() => moveDay(1)} disabled={selectedDay !== "week" && selectedIndex >= 6} aria-label="Jour suivant" className="grid h-9 w-9 place-items-center rounded-xl border border-white/[0.07] text-[#8D95A3] transition hover:text-white disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
            <button type="button" onClick={() => setSelectedDay("week")} className={`rounded-xl border px-2 py-2.5 text-center transition ${selectedDay === "week" ? "border-[#7C4DFF]/60 bg-[#7C4DFF]/15 text-white" : "border-white/[0.07] text-[#7A8290] hover:text-white"}`}><span className="block text-[10px] font-semibold">Toute</span><span className="mt-0.5 block text-[9px]">la semaine</span></button>
            {weekDays.map(day => {
              const key = localDayKey(day);
              const active = selectedDay === key;
              const count = events.filter(event => localDayKey(event.date) === key && ["2", "3"].includes(event.impact)).length;
              return <button key={key} type="button" onClick={() => setSelectedDay(key)} className={`relative rounded-xl border px-2 py-2.5 text-center transition ${active ? "border-[#7C4DFF]/60 bg-[#7C4DFF]/15 text-white" : "border-white/[0.07] text-[#7A8290] hover:text-white"}`}><span className="block text-[10px] font-semibold capitalize">{new Intl.DateTimeFormat("fr-FR", { weekday: "short" }).format(day)}</span><span className="mt-0.5 block text-sm font-semibold">{day.getDate()}</span>{count > 0 && <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#FF5252]" />}</button>;
            })}
          </div>
        </div>

        <div className="border-b border-white/[0.07] p-4 sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div><div className="flex items-center gap-2 text-sm font-semibold text-white"><SlidersHorizontal className="h-4 w-4 text-[#8C73FF]" /> Personnaliser l'affichage</div><p className="mt-1 text-xs leading-5 text-[#737B8A]">Tes devises, impacts et favoris sont mémorisés sur cet appareil.</p></div>
            <button type="button" onClick={reset} className="inline-flex items-center gap-2 self-start text-xs text-[#8D95A3] transition hover:text-white"><RotateCcw className="h-3.5 w-3.5" /> Réinitialiser</button>
          </div>
          <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_auto]">
            <div><div className="mb-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#626A79]">Devises suivies</div><div className="flex flex-wrap gap-2">{CURRENCIES.map(([id, code]) => <Toggle key={id} active={preferences.currencies.includes(id)} onClick={() => toggle("currencies", id)} ariaLabel={`${code} ${preferences.currencies.includes(id) ? "activée" : "désactivée"}`}>{code}</Toggle>)}</div></div>
            <div><div className="mb-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#626A79]">Impact attendu</div><div className="flex flex-wrap gap-2">{IMPACTS.map(([id, label, color]) => <Toggle key={id} active={preferences.impacts.includes(id)} onClick={() => toggle("impacts", id)} ariaLabel={`Impact ${label}`}><span className="inline-flex items-center gap-2"><span className={`h-1.5 w-1.5 rounded-full ${color}`} />{label}</span></Toggle>)}</div></div>
          </div>
          <div className="relative mt-5 max-w-md"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#626A79]" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Rechercher une annonce ou une devise…" className="pe-control w-full pl-10 text-xs" /></div>
        </div>

        {preferences.currencies.length === 0 || preferences.impacts.length === 0 ? (
          <Empty icon={SlidersHorizontal} title="Sélection incomplète" copy="Active au moins une devise et un niveau d’impact." />
        ) : visibleEvents.length ? (
          <div className="min-h-[360px] divide-y divide-white/[0.07]">
            {Object.entries(groupedEvents).map(([date, dayEvents]) => (
              <section key={date} className="grid md:grid-cols-[190px_1fr]">
                <div className="border-b border-white/[0.06] bg-white/[0.015] px-4 py-4 text-xs font-semibold capitalize text-[#AEB5C1] md:border-b-0 md:border-r md:px-5">{date}<div className="mt-1 text-[9px] font-normal text-[#636B78]">{dayEvents.length} annonce{dayEvents.length > 1 ? "s" : ""}</div></div>
                <div className="divide-y divide-white/[0.06]">
                  {dayEvents.map(event => {
                    const impact = IMPACT_META[event.impact];
                    const released = event.actual !== "";
                    return (
                      <article key={event.id} className="grid gap-3 px-4 py-4 sm:grid-cols-[70px_54px_minmax(180px,1fr)_repeat(3,minmax(64px,90px))_32px] sm:items-center sm:px-5">
                        <time className="text-sm font-semibold tabular-nums text-white">{new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(new Date(event.date))}</time>
                        <span className="w-fit rounded-lg border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-[10px] font-bold text-[#D7DBE2]">{event.currency}</span>
                        <div><div className="flex flex-wrap items-center gap-2 text-sm font-medium text-[#E4E7EC]">{event.title}{released && <CheckCircle2 className="h-3.5 w-3.5 text-[#35D6A0]" />}</div><div className={`mt-1 flex items-center gap-1.5 text-[10px] ${impact.text}`}><span className={`h-1.5 w-1.5 rounded-full ${impact.dot}`} />Impact {impact.label.toLowerCase()}</div></div>
                        {[["Réel", event.actual], ["Prévu", event.forecast], ["Préc.", event.previous]].map(([label, value]) => <div key={label} className="flex items-center justify-between gap-2 sm:block"><span className="text-[9px] uppercase tracking-[.12em] text-[#5F6775]">{label}</span><div className={`mt-0.5 text-xs font-medium tabular-nums ${label === "Réel" && value ? "text-[#35D6A0]" : "text-[#B9C0CB]"}`}>{value || "—"}</div></div>)}
                        <button type="button" onClick={() => toggleFavorite(event.id)} aria-label={event.favorite ? "Retirer des favoris" : "Ajouter aux favoris"} className={`grid h-8 w-8 place-items-center rounded-lg transition ${event.favorite ? "bg-[#7C4DFF]/15 text-[#B58BFF]" : "text-[#535B69] hover:bg-white/[0.04] hover:text-white"}`}><Star className={`h-4 w-4 ${event.favorite ? "fill-current" : ""}`} /></button>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        ) : loading ? (
          <Empty icon={RefreshCw} title="Synchronisation du calendrier…" copy="Récupération des annonces économiques de la semaine." spinning />
        ) : syncError && !events.length ? (
          <Empty icon={WifiOff} title="Source temporairement indisponible" copy="Réessaie dans quelques instants. Le calendrier se reconnectera automatiquement." action={() => synchronize(true, true)} />
        ) : (
          <Empty icon={CalendarDays} title="Aucune annonce pour cette sélection" copy="Choisis un autre jour, une autre devise ou active davantage de niveaux d’impact." />
        )}

        <div className="flex flex-col gap-1 border-t border-white/[0.07] px-4 py-3 text-[10px] leading-4 text-[#626A79] sm:flex-row sm:items-center sm:justify-between sm:px-5"><span>Données de calendrier fournies par Forex Factory, actualisées automatiquement.</span><span>Les horaires et prévisions peuvent être révisés par la source.</span></div>
      </section>
    </div>
  );
}

function Empty({ icon: Icon, title, copy, action, spinning = false }) {
  return <div className="grid min-h-[360px] place-items-center px-6 text-center"><div className="max-w-md"><Icon className={`mx-auto h-9 w-9 text-[#65548B] ${spinning ? "animate-spin" : ""}`} /><p className="mt-4 text-sm font-semibold text-white">{title}</p><p className="mt-2 text-xs leading-5 text-[#747C8B]">{copy}</p>{action && <button type="button" onClick={action} className="mt-4 rounded-xl bg-[#7147FF] px-4 py-2.5 text-xs font-semibold text-white">Réessayer</button>}</div></div>;
}
