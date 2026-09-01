import React, { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Home, Wallet, BookOpen, FlaskConical, BarChart3, Brain, Shield, Banknote, FileText, Settings as Cog, LogOut, Search, Bell, Menu, X, PanelLeftClose, PanelLeftOpen, CalendarDays } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { LogoMark } from "@/components/Logo";
import { dashboard, accounts as accountsAPI, trades as tradesAPI } from "@/lib/api";
import { useI18n } from "@/context/I18nContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { applyDocumentPreferences, readSettings, SETTINGS_EVENT } from "@/lib/preferences";
import { BILLING_CONFIG, COMMERCIAL_PHASES } from "@/config/billing";
import { evaluateRiskAlerts } from "@/lib/riskEngine";

const NAV_LINKS = [
  { to: "/app/dashboard", fr: "Aperçu", en: "Overview", icon: Home, testid: "nav-dashboard" },
  { to: "/app/accounts", fr: "Comptes", en: "Accounts", icon: Wallet, testid: "nav-accounts" },
  { to: "/app/journal", fr: "Journal", en: "Journal", icon: BookOpen, testid: "nav-journal" },
  { to: "/app/markets", fr: "Marchés", en: "Markets", icon: BarChart3, testid: "nav-markets" },
  { to: "/app/economic-calendar", fr: "Calendrier éco", en: "Economic calendar", icon: CalendarDays, testid: "nav-economic-calendar" },
  { to: "/app/backtest", fr: "Simulateur", en: "Simulator", icon: FlaskConical, testid: "nav-backtest" },
  { to: "/app/analytics", fr: "Statistiques", en: "Analytics", icon: BarChart3, testid: "nav-analytics" },
  { to: "/app/coach", fr: "Analyse IA", en: "AI Analysis", icon: Brain, testid: "nav-coach" },
  { to: "/app/discipline", fr: "Discipline", en: "Discipline", icon: Shield, testid: "nav-discipline" },
  { to: "/app/payouts", fr: "Payouts", en: "Payouts", icon: Banknote, testid: "nav-payouts" },
  { to: "/app/dna", fr: "Rapports", en: "Reports", icon: FileText, testid: "nav-dna" },
  { to: "/app/settings", fr: "Paramètres", en: "Settings", icon: Cog, testid: "nav-settings" },
];

const MOBILE_NAV_ROUTES = new Set([
  "/app/dashboard",
  "/app/accounts",
  "/app/journal",
  "/app/analytics",
  "/app/settings",
]);

export default function AppShell() {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const nav = useNavigate();
  const links = useMemo(() => NAV_LINKS.map(link => ({ ...link, label: t(link.fr, link.en) })), [t]);
  const mobileLinks = useMemo(() => links.filter(link => MOBILE_NAV_ROUTES.has(link.to)), [links]);
  const [discipline, setDiscipline] = useState(0);
  const [summary, setSummary] = useState(null);
  const [riskAlerts, setRiskAlerts] = useState([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return window.localStorage.getItem("pipsevo.sidebar.collapsed") === "true";
    } catch {
      return false;
    }
  });
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [settings, setSettings] = useState(readSettings);

  useEffect(() => {
    Promise.all([dashboard(), accountsAPI.list(), tradesAPI.list()]).then(([dashboardResponse, accountResponse, tradeResponse]) => {
      setDiscipline(dashboardResponse.data?.kpis?.discipline_score ?? 0);
      setSummary(dashboardResponse.data);
      setRiskAlerts(evaluateRiskAlerts({ accounts: accountResponse.data, trades: tradeResponse.data, rules: user?.rules || {} }));
    }).catch(() => {});
  }, [user?.rules]);

  useEffect(() => {
    const applyPreferences = (event) => { const next = event.detail || readSettings(); setSettings(next); applyDocumentPreferences(next); };
    applyPreferences({ detail: readSettings() });
    window.addEventListener(SETTINGS_EVENT, applyPreferences);
    return () => window.removeEventListener(SETTINGS_EVENT, applyPreferences);
  }, []);

  useEffect(() => { const shortcut=e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();setSearchOpen(true)}}; window.addEventListener("keydown",shortcut); return()=>window.removeEventListener("keydown",shortcut); }, []);

  // Bloque le scroll du body quand le menu mobile est ouvert
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  useEffect(() => {
    try {
      window.localStorage.setItem("pipsevo.sidebar.collapsed", String(sidebarCollapsed));
    } catch {
      // Le stockage local peut être indisponible en navigation privée stricte.
    }
  }, [sidebarCollapsed]);

  // Ferme le menu mobile avec la touche Escape
  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (e) => { if (e.key === "Escape") setMobileOpen(false); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  const closeMobile = () => setMobileOpen(false);
  return (
    <div className="min-h-screen bg-[#050505] text-white w-full overflow-x-hidden">
      {/* Backdrop — mobile uniquement, sous la sidebar mais au-dessus du contenu */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={closeMobile}
          data-testid="sidebar-backdrop"
        />
      )}
      {searchOpen && <div className="fixed inset-0 z-[70] bg-black/70 p-4 flex items-start justify-center pt-[12vh]" onClick={()=>setSearchOpen(false)}>
        <div className="w-full max-w-lg card-elev p-4" onClick={e=>e.stopPropagation()}>
          <input autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder="Rechercher une page…" className="w-full bg-[#0D1020] border border-white/10 rounded-xl px-4 py-3" />
          <div className="mt-3 space-y-1">{links.filter(l=>l.label.toLowerCase().includes(query.toLowerCase())).map(l=><button key={l.to} onClick={()=>{nav(l.to);setSearchOpen(false);setQuery("")}} className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5">{l.label}</button>)}{!links.some(l=>l.label.toLowerCase().includes(query.toLowerCase()))&&<div className="py-8 text-center text-xs text-[#7E8798]">Aucune page trouvée.</div>}</div>
        </div>
      </div>}

      {/* SIDEBAR — fixed sur mobile ET desktop, largeur/translation gérées par breakpoint */}
      <aside
        className={`fixed top-0 left-0 z-50 h-[100dvh] w-[min(280px,85vw)] border-r border-white/5 bg-[#050505] flex flex-col
        transition-[width,transform] duration-300 ease-out
        ${sidebarCollapsed ? "md:w-[72px]" : "md:w-[232px]"}
        ${mobileOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}
        data-testid="app-sidebar"
      >
        <div className={`flex h-[60px] shrink-0 items-center justify-between gap-2.5 px-4 md:h-[68px] ${sidebarCollapsed ? "md:justify-center md:px-2" : ""}`}>
          <NavLink
            to="/app/dashboard"
            aria-label="Retour au tableau de bord"
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl transition hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C4DFF]/70 ${sidebarCollapsed ? "md:hidden" : ""}`}
          >
            <LogoMark size="md" className="!h-6 !w-6 md:!h-8 md:!w-8" />
          </NavLink>
          <button
            onClick={() => setSidebarCollapsed(value => !value)}
            className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#9CA3AF] transition hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C4DFF]/70 md:flex"
            aria-label={sidebarCollapsed ? "Déployer la navigation" : "Réduire la navigation"}
            title={sidebarCollapsed ? "Déployer la navigation" : "Réduire la navigation"}
          >
            {sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
          <button
            onClick={closeMobile}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#9CA3AF] transition hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C4DFF]/70 md:hidden"
            aria-label="Fermer le menu"
            data-testid="sidebar-close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 flex flex-col gap-0.5 overflow-y-auto min-h-0">
          {links.map(({ to, label, icon: Icon, testid }) => (
            <NavLink
              key={to}
              to={to}
              end
              onClick={closeMobile}
              data-testid={testid}
              title={sidebarCollapsed ? label : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition whitespace-nowrap ${sidebarCollapsed ? "md:justify-center md:px-2" : ""} ${
                  isActive
                    ? "bg-[#7C4DFF]/20 text-white border border-[#7C4DFF]/30 shadow-[0_0_20px_-6px_rgba(124,77,255,0.5)]"
                    : "text-[#9CA3AF] hover:text-white hover:bg-white/[0.04]"
                }`
              }
            >
              <Icon className="w-[18px] h-[18px] shrink-0" />
              <span className={sidebarCollapsed ? "md:hidden" : ""}>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Discipline du jour */}
        <div className={`px-3 mt-2 shrink-0 ${sidebarCollapsed ? "md:hidden" : ""}`}>
          <div className="card-flat px-3 py-2.5 text-center">
            <div className="whitespace-nowrap font-mono text-[9px] uppercase tracking-[0.18em] text-[#9CA3AF]">Discipline du jour</div>
            <div className="mt-2">
              <svg viewBox="0 0 80 46" className="mx-auto h-8 w-24 max-w-full" aria-label={`Score de discipline : ${discipline} sur 100`}>
                <defs>
                  <linearGradient id="gauge-a" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#7C4DFF" />
                    <stop offset="100%" stopColor="#B58BFF" />
                  </linearGradient>
                </defs>
                <path d="M10 40 A30 30 0 0 1 70 40" stroke="#1E2430" strokeWidth="6" fill="none" strokeLinecap="round" />
                <path
                  d="M10 40 A30 30 0 0 1 70 40"
                  stroke="url(#gauge-a)"
                  strokeWidth="6"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray="95"
                  strokeDashoffset={95 - (discipline / 100) * 95}
                />
              </svg>
              <div className="mt-1 font-mono text-base font-bold leading-none">
                {discipline}
                <span className="ml-1 text-[8px] text-[#9CA3AF]">/100</span>
              </div>
            </div>
            <div className={`mt-1 text-[9px] leading-tight ${discipline>=80?"text-[#00E676]":discipline>=60?"text-[#FFB855]":"text-[#FF7272]"}`}>{discipline>=80?"Excellent":discipline>=60?"À consolider":discipline?"À améliorer":"En attente"}</div>
            <svg viewBox="0 0 80 18" className="mx-auto mt-1 h-3 w-24 max-w-full">
              <path d={discipline > 0 ? "M0,15 L10,12 L20,13 L30,9 L40,10 L50,6 L60,7 L70,3 L80,4" : "M0,13 L80,13"} stroke={discipline > 0 ? "#7C4DFF" : "#343A47"} strokeWidth="1.5" fill="none" />
            </svg>
          </div>
        </div>

        {/* Upgrade card */}
        <div className={`px-3 mt-2 mb-2 shrink-0 ${sidebarCollapsed ? "md:hidden" : ""}`}>
          <div className="card-flat p-3">
            <div className="text-xs font-semibold leading-tight">{BILLING_CONFIG.currentPhase===COMMERCIAL_PHASES.BETA?"Bêta gratuite":"Découvre les offres"}</div>
            <div className="mt-1 text-[9px] leading-[1.45] text-[#9CA3AF]">{BILLING_CONFIG.currentPhase===COMMERCIAL_PHASES.BETA?"Les fonctions essentielles sont gratuites. Les outils avancés arrivent au lancement.":"Compare Essential et Pro sans engagement."}</div>
            <button
              onClick={() => { closeMobile(); nav("/pricing"); }}
              className="mt-2 w-full rounded-lg bg-gradient-to-r from-[#7C4DFF] to-[#5A2DFF] py-1.5 text-[10px] font-semibold transition hover:opacity-90"
              data-testid="sidebar-upgrade"
            >
              {BILLING_CONFIG.currentPhase===COMMERCIAL_PHASES.BETA?"Voir la roadmap →":"Voir les tarifs →"}
            </button>
          </div>
        </div>

        <div className="border-t border-white/5 px-3 py-3 text-xs text-[#9CA3AF] shrink-0">
          <button
            onClick={async () => { await logout(); window.location.href = "/"; }}
            className={`flex items-center gap-2 hover:text-[#FF5252] ${sidebarCollapsed ? "md:w-full md:justify-center md:gap-0" : ""}`}
            title={sidebarCollapsed ? "Déconnexion" : undefined}
            data-testid="sidebar-logout"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className={sidebarCollapsed ? "md:hidden" : ""}>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* MAIN — suit la largeur de la navigation sur desktop, pleine largeur sur mobile */}
      <div className={`w-full min-w-0 overflow-x-hidden transition-[margin,width] duration-300 ${
        sidebarCollapsed
          ? "md:ml-[72px] md:w-[calc(100%-72px)]"
          : "md:ml-[232px] md:w-[calc(100%-232px)]"
      }`}>
        <TopBar
          user={user}
          onMenuClick={() => setMobileOpen(true)}
          onSearch={()=>setSearchOpen(true)}
          notificationsOpen={notificationsOpen}
          notifications={buildNotifications(summary, settings, t, riskAlerts)}
          onNotifications={()=>setNotificationsOpen(v=>!v)}
          onNavigate={(to)=>nav(to)}
          onLogout={async()=>{ await logout(); window.location.href = "/"; }}
        />
        <main className="pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">
          <Outlet />
        </main>
      </div>

      <nav
        aria-label="Navigation principale mobile"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[#07080C]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
      >
        <div className="grid h-16 grid-cols-5">
          {mobileLinks.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end
              onClick={closeMobile}
              className={({ isActive }) =>
                `flex min-w-0 flex-col items-center justify-center gap-1 px-1 text-[10px] transition ${
                  isActive ? "text-white" : "text-[#7E8798]"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={`grid h-8 w-10 place-items-center rounded-xl transition ${
                    isActive ? "bg-[#7C4DFF]/20 text-[#A885FF]" : ""
                  }`}>
                    <Icon className="h-[18px] w-[18px]" />
                  </span>
                  <span className="max-w-full truncate">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}

function TopBar({ user, onMenuClick, onSearch, notificationsOpen, notifications, onNotifications, onNavigate, onLogout }) {
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  useEffect(() => {
    const close = (e) => {
      if (e.key === "Escape" || (e.type === "mousedown" && !profileRef.current?.contains(e.target))) setProfileOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", close); };
  }, []);
  return (
    <header className="sticky top-0 z-30 flex h-[60px] w-full min-w-0 items-center gap-1.5 border-b border-white/5 bg-[#050505]/80 px-3 py-0 backdrop-blur-xl sm:gap-2 sm:px-4 md:h-[68px] md:gap-3 md:px-5">
      {/* Hamburger — mobile uniquement */}
      <button
        onClick={onMenuClick}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[#9CA3AF] transition hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C4DFF]/70 md:hidden"
        aria-label="Ouvrir le menu"
        data-testid="top-menu-toggle"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Sur mobile, le favicon compact reste à côté du menu hamburger. */}
      <button onClick={()=>onNavigate("/app/dashboard")} aria-label="Retour au tableau de bord" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl transition hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C4DFF]/70 md:hidden">
        <LogoMark size="sm" className="!h-6 !w-6" />
      </button>

      {/* Barre de recherche — desktop uniquement */}
      <button onClick={onSearch} aria-label="Ouvrir la recherche" className="relative hidden min-w-0 max-w-md flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C4DFF]/70 md:block">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
        <input readOnly
          placeholder="Rechercher…"
          data-testid="top-search"
          className="w-full bg-[#0D1020] border border-white/5 rounded-xl pl-10 pr-12 py-2 text-sm placeholder:text-[#6B7280] focus:border-[#7C4DFF]/40"
        />
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-white/10 bg-black/10 px-1.5 py-0.5 font-mono text-[9px] leading-none text-[#6B7280]">⌘K</kbd>
      </button>

      <div className="flex-1 min-w-0" />

      {/* Icône recherche seule — mobile */}
      <button
        onClick={onSearch}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[#9CA3AF] transition hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C4DFF]/70 md:hidden"
        aria-label="Rechercher"
        data-testid="top-search-mobile"
      >
        <Search className="w-4 h-4" />
      </button>

      <div className="relative"><button onClick={onNotifications} aria-label="Ouvrir les notifications" aria-expanded={notificationsOpen} aria-controls="app-notifications-menu" className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C4DFF]/70" data-testid="top-notifs">
        <Bell className="w-4 h-4 text-[#9CA3AF]" />
        {!!notifications.length && <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-[#FF4FD8] rounded-full" />}
      </button>{notificationsOpen && <div id="app-notifications-menu" className="fixed left-3 right-3 top-[68px] z-50 w-auto card-elev p-4 md:absolute md:left-auto md:right-0 md:top-11 md:w-72"><div className="text-sm font-semibold">Notifications</div>{notifications.length?<div className="mt-3 space-y-2">{notifications.map(n=><button key={n.to+n.text} onClick={()=>{onNavigate(n.to);onNotifications()}} className="w-full rounded-xl border border-white/[0.06] p-3 text-left text-xs text-[#B5BBC9] hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C4DFF]/70">{n.text}</button>)}</div>:<div className="text-xs text-[#9CA3AF] mt-3">Tout est à jour. Aucune alerte active.</div>}</div>}</div>

      <div ref={profileRef} className="relative shrink-0">
      <button onClick={()=>setProfileOpen(v=>!v)} aria-expanded={profileOpen} aria-controls="app-profile-menu" aria-label="Ouvrir le menu du profil" className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#0D1020] px-1.5 py-1 transition hover:border-[#7C4DFF]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C4DFF]/70 md:gap-2 md:px-2 md:py-1.5">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#7C4DFF] to-[#4F8CFF] text-[10px] font-bold md:h-7 md:w-7 md:text-xs">
          {(user?.name || user?.email || "U")[0].toUpperCase()}
        </div>
        <div className="hidden max-w-32 truncate whitespace-nowrap text-sm font-medium lg:max-w-48 sm:block" data-testid="top-username">
          {user?.name || user?.email}
        </div>
        <span className="hidden whitespace-nowrap rounded-md border border-[#7C4DFF]/30 bg-[#7C4DFF]/15 px-1 py-0.5 text-[9px] font-semibold leading-none tracking-[0.08em] text-[#B58BFF] sm:inline">
          PRO
        </span>
        <span className={`text-[#9CA3AF] text-xs transition-transform ${profileOpen ? "rotate-180" : ""}`}>⌄</span>
      </button>
      {profileOpen && <div id="app-profile-menu" className="absolute right-0 top-11 z-50 w-[min(16rem,calc(100vw-1.5rem))] card-elev p-2 shadow-2xl md:top-12">
        <div className="px-3 py-3 border-b border-white/5">
          <div className="text-sm font-semibold truncate">{user?.name || "Utilisateur"}</div>
          <div className="text-xs text-[#9CA3AF] truncate mt-0.5">{user?.email}</div>
        </div>
        <button onClick={()=>{onNavigate("/app/settings");setProfileOpen(false)}} className="w-full flex items-center gap-3 px-3 py-2.5 mt-1 rounded-lg text-sm text-[#B5BBC9] hover:text-white hover:bg-white/5"><Cog className="w-4 h-4"/>Mon profil et paramètres</button>
        <button onClick={()=>{onNavigate("/app/accounts");setProfileOpen(false)}} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#B5BBC9] hover:text-white hover:bg-white/5"><Wallet className="w-4 h-4"/>Mes comptes</button>
        <button onClick={()=>{onNavigate("/faq");setProfileOpen(false)}} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#B5BBC9] hover:text-white hover:bg-white/5"><BookOpen className="w-4 h-4"/>FAQ et centre d'aide</button>
        <button onClick={()=>{onNavigate("/contact");setProfileOpen(false)}} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#B5BBC9] hover:text-white hover:bg-white/5"><Bell className="w-4 h-4"/>Contacter le support</button>
        <div className="mt-1 flex items-center justify-between border-t border-white/5 px-3 py-2.5"><span className="text-sm text-[#B5BBC9]">Langue</span><LanguageSwitcher/></div>
        <button onClick={onLogout} className="w-full flex items-center gap-3 px-3 py-2.5 border-t border-white/5 mt-1 rounded-lg text-sm text-[#FF7A7A] hover:bg-[#FF5252]/10"><LogOut className="w-4 h-4"/>Se déconnecter</button>
      </div>}
      </div>
    </header>
  );
}

function buildNotifications(summary, settings, t, riskAlerts = []) {
  if (!summary) return [];
  const out = [];
  if (settings.daily && !summary.kpis?.active_accounts) out.push({ text: t("Ajoute ton premier compte pour commencer le suivi.", "Add your first account to start tracking."), to: "/app/accounts" });
  else if (settings.daily && !summary.kpis?.total_trades) out.push({ text: t("Journalise ton premier trade pour activer les analyses.", "Log your first trade to activate analytics."), to: "/app/journal" });
  if (settings.risk && summary.metrics?.plan_respect_rate < 80 && summary.kpis?.total_trades) out.push({ text: t(`Plan respecté sur ${summary.metrics.plan_respect_rate}% des trades. Consulte ta discipline.`, `Plan followed on ${summary.metrics.plan_respect_rate}% of trades. Review your discipline.`), to: "/app/discipline" });
  if (settings.risk) riskAlerts.slice(0, 3).forEach(alert => out.push({ text: alert.title, to: "/app/discipline" }));
  if (settings.payout && summary.kpis?.active_accounts && !summary.kpis?.total_payouts) out.push({ text: t("Configure ton objectif de payout pour suivre ta progression.", "Set your payout goal to track your progress."), to: "/app/payouts" });
  return out;
}
