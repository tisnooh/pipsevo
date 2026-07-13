import React, { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Home, Wallet, BookOpen, FlaskConical, BarChart3, Brain, Shield, Banknote, FileText, Settings as Cog, LogOut, Search, Bell, Menu, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { LogoMark, LogoWordmark } from "@/components/Logo";
import { dashboard } from "@/lib/api";

const links = [
  { to: "/app/dashboard", label: "Aperçu", icon: Home, testid: "nav-dashboard" },
  { to: "/app/accounts", label: "Comptes", icon: Wallet, testid: "nav-accounts" },
  { to: "/app/journal", label: "Journal", icon: BookOpen, testid: "nav-journal" },
  { to: "/app/markets", label: "Marchés", icon: BarChart3, testid: "nav-markets" },
  { to: "/app/backtest", label: "Backtest", icon: FlaskConical, testid: "nav-backtest" },
  { to: "/app/analytics", label: "Statistiques", icon: BarChart3, testid: "nav-analytics" },
  { to: "/app/coach", label: "Analyse IA", icon: Brain, testid: "nav-coach" },
  { to: "/app/discipline", label: "Discipline", icon: Shield, testid: "nav-discipline" },
  { to: "/app/payouts", label: "Payouts", icon: Banknote, testid: "nav-payouts" },
  { to: "/app/dna", label: "Rapports", icon: FileText, testid: "nav-dna" },
  { to: "/app/settings", label: "Paramètres", icon: Cog, testid: "nav-settings" },
];

export default function AppShell() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [discipline, setDiscipline] = useState(0);
  const [summary, setSummary] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    dashboard().then(r => { setDiscipline(r.data?.kpis?.discipline_score ?? 0); setSummary(r.data); }).catch(() => {});
  }, []);

  useEffect(() => {
    const applyPreferences = () => { try { const s=JSON.parse(localStorage.getItem("pipsevo_settings"))||{}; document.documentElement.dataset.density=s.compactMode?"compact":"comfortable"; } catch {} };
    applyPreferences(); window.addEventListener("pipsevo:settings-updated", applyPreferences);
    return () => window.removeEventListener("pipsevo:settings-updated", applyPreferences);
  }, []);

  useEffect(() => { const shortcut=e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();setSearchOpen(true)}}; window.addEventListener("keydown",shortcut); return()=>window.removeEventListener("keydown",shortcut); }, []);

  // Bloque le scroll du body quand le menu mobile est ouvert
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

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
        className={`fixed top-0 left-0 z-50 h-[100dvh] w-[min(280px,85vw)] md:w-64 border-r border-white/5 bg-[#050505] flex flex-col
        transition-transform duration-300 ease-out
        ${mobileOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}
        data-testid="app-sidebar"
      >
        <div className="px-5 py-5 flex items-center justify-between gap-2.5 shrink-0">
          <LogoWordmark to="/app/dashboard" size="md" />
          <button
            onClick={closeMobile}
            className="md:hidden w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center text-[#9CA3AF]"
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
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition whitespace-nowrap ${
                  isActive
                    ? "bg-[#7C4DFF]/20 text-white border border-[#7C4DFF]/30 shadow-[0_0_20px_-6px_rgba(124,77,255,0.5)]"
                    : "text-[#9CA3AF] hover:text-white hover:bg-white/[0.04]"
                }`
              }
            >
              <Icon className="w-[18px] h-[18px] shrink-0" /> {label}
            </NavLink>
          ))}
        </nav>

        {/* Discipline du jour */}
        <div className="px-3 mt-3 shrink-0">
          <div className="card-flat p-4 text-center">
            <div className="text-[10px] font-mono uppercase tracking-widest text-[#9CA3AF]">Discipline du jour</div>
            <div className="relative mt-2 mb-1">
              <svg viewBox="0 0 80 50" className="w-full h-12 mx-auto">
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
              <div className="absolute inset-0 flex flex-col items-center justify-center pt-1">
                <div className="text-xl font-bold font-mono">
                  {discipline}
                  <span className="text-xs text-[#9CA3AF]">/100</span>
                </div>
              </div>
            </div>
            <div className={`text-[10px] ${discipline>=80?"text-[#00E676]":discipline>=60?"text-[#FFB855]":"text-[#FF7272]"}`}>{discipline>=80?"Excellent":discipline>=60?"À consolider":discipline?"À améliorer":"En attente"}</div>
            <svg viewBox="0 0 80 18" className="w-full h-4 mt-2">
              <path d="M0,15 L10,12 L20,13 L30,9 L40,10 L50,6 L60,7 L70,3 L80,4" stroke="#7C4DFF" strokeWidth="1.5" fill="none" />
            </svg>
          </div>
        </div>

        {/* Upgrade card */}
        <div className="px-3 mt-3 mb-2 shrink-0">
          <div className="card-flat p-4">
            <div className="text-sm font-semibold">Passe à Pro</div>
            <div className="text-[10px] text-[#9CA3AF] mt-1">Plus d'analyses. Plus d'insights.<br />Plus de payouts.</div>
            <button
              onClick={() => { closeMobile(); nav("/app/settings"); }}
              className="mt-3 w-full text-xs py-2 rounded-lg bg-gradient-to-r from-[#7C4DFF] to-[#5A2DFF] hover:opacity-90 transition font-semibold"
              data-testid="sidebar-upgrade"
            >
              Mettre à niveau →
            </button>
          </div>
        </div>

        <div className="border-t border-white/5 px-3 py-3 text-xs text-[#9CA3AF] shrink-0">
          <button
            onClick={() => { logout(); window.location.href = "/"; }}
            className="flex items-center gap-2 hover:text-[#FF5252]"
            data-testid="sidebar-logout"
          >
            <LogOut className="w-3.5 h-3.5" /> Déconnexion
          </button>
        </div>
      </aside>

      {/* MAIN — décalé de 256px uniquement à partir de md (768px), pleine largeur sinon */}
      <div className="w-full min-w-0 overflow-x-hidden md:ml-64 md:w-[calc(100%-16rem)]">
        <TopBar
          user={user}
          onMenuClick={() => setMobileOpen(true)}
          onSearch={()=>setSearchOpen(true)}
          notificationsOpen={notificationsOpen}
          notifications={buildNotifications(summary)}
          onNotifications={()=>setNotificationsOpen(v=>!v)}
          onNavigate={(to)=>nav(to)}
          onLogout={()=>{ logout(); window.location.href = "/"; }}
        />
        <Outlet />
      </div>
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
    <div className="sticky top-0 z-30 bg-[#050505]/80 backdrop-blur-xl border-b border-white/5 px-4 md:px-6 py-3 flex items-center gap-3 w-full min-w-0">
      {/* Hamburger — mobile uniquement */}
      <button
        onClick={onMenuClick}
        className="md:hidden w-9 h-9 shrink-0 rounded-xl hover:bg-white/5 flex items-center justify-center text-[#9CA3AF]"
        aria-label="Ouvrir le menu"
        data-testid="top-menu-toggle"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Sur mobile, le favicon compact reste à côté du menu hamburger. */}
      <button onClick={()=>onNavigate("/app/dashboard")} aria-label="Retour au tableau de bord" className="md:hidden grid h-9 w-9 shrink-0 place-items-center rounded-xl hover:bg-white/5">
        <LogoMark size="sm" />
      </button>

      {/* Barre de recherche — desktop uniquement */}
      <button onClick={onSearch} className="hidden md:block flex-1 min-w-0 max-w-md relative text-left">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
        <input readOnly
          placeholder="Rechercher…"
          data-testid="top-search"
          className="w-full bg-[#0D1020] border border-white/5 rounded-xl pl-10 pr-12 py-2 text-sm placeholder:text-[#6B7280] focus:border-[#7C4DFF]/40"
        />
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-[#6B7280] border border-white/10 rounded px-1.5 py-0.5">⌘K</kbd>
      </button>

      <div className="flex-1 min-w-0" />

      {/* Icône recherche seule — mobile */}
      <button
        onClick={onSearch}
        className="md:hidden w-9 h-9 shrink-0 rounded-xl hover:bg-white/5 flex items-center justify-center text-[#9CA3AF]"
        aria-label="Rechercher"
        data-testid="top-search-mobile"
      >
        <Search className="w-4 h-4" />
      </button>

      <div className="relative"><button onClick={onNotifications} className="relative w-9 h-9 shrink-0 rounded-xl hover:bg-white/5 flex items-center justify-center" data-testid="top-notifs">
        <Bell className="w-4 h-4 text-[#9CA3AF]" />
        {!!notifications.length && <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-[#FF4FD8] rounded-full" />}
      </button>{notificationsOpen && <div className="absolute right-0 top-11 w-72 card-elev p-4 z-50"><div className="text-sm font-semibold">Notifications</div>{notifications.length?<div className="mt-3 space-y-2">{notifications.map(n=><button key={n.to+n.text} onClick={()=>{onNavigate(n.to);onNotifications()}} className="w-full rounded-xl border border-white/[0.06] p-3 text-left text-xs text-[#B5BBC9] hover:bg-white/[0.04]">{n.text}</button>)}</div>:<div className="text-xs text-[#9CA3AF] mt-3">Tout est à jour. Aucune alerte active.</div>}</div>}</div>

      <div ref={profileRef} className="relative shrink-0">
      <button onClick={()=>setProfileOpen(v=>!v)} aria-expanded={profileOpen} aria-label="Ouvrir le menu du profil" className="flex items-center gap-2 px-2 py-1.5 rounded-xl border border-white/10 bg-[#0D1020] hover:border-[#7C4DFF]/40 transition">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#7C4DFF] to-[#4F8CFF] flex items-center justify-center text-xs font-bold shrink-0">
          {(user?.name || user?.email || "U")[0].toUpperCase()}
        </div>
        <div className="hidden sm:block text-sm font-medium whitespace-nowrap" data-testid="top-username">
          {user?.name || user?.email}
        </div>
        <span className="hidden sm:inline text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded bg-[#7C4DFF]/20 text-[#B58BFF] border border-[#7C4DFF]/30 whitespace-nowrap">
          PRO
        </span>
        <span className={`text-[#9CA3AF] text-xs transition-transform ${profileOpen ? "rotate-180" : ""}`}>⌄</span>
      </button>
      {profileOpen && <div className="absolute right-0 top-12 z-50 w-64 card-elev p-2 shadow-2xl">
        <div className="px-3 py-3 border-b border-white/5">
          <div className="text-sm font-semibold truncate">{user?.name || "Utilisateur"}</div>
          <div className="text-xs text-[#9CA3AF] truncate mt-0.5">{user?.email}</div>
        </div>
        <button onClick={()=>{onNavigate("/app/settings");setProfileOpen(false)}} className="w-full flex items-center gap-3 px-3 py-2.5 mt-1 rounded-lg text-sm text-[#B5BBC9] hover:text-white hover:bg-white/5"><Cog className="w-4 h-4"/>Mon profil et paramètres</button>
        <button onClick={()=>{onNavigate("/app/accounts");setProfileOpen(false)}} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#B5BBC9] hover:text-white hover:bg-white/5"><Wallet className="w-4 h-4"/>Mes comptes</button>
        <button onClick={()=>{onNavigate("/faq");setProfileOpen(false)}} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#B5BBC9] hover:text-white hover:bg-white/5"><BookOpen className="w-4 h-4"/>FAQ et centre d'aide</button>
        <button onClick={()=>{onNavigate("/contact");setProfileOpen(false)}} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#B5BBC9] hover:text-white hover:bg-white/5"><Bell className="w-4 h-4"/>Contacter le support</button>
        <button onClick={onLogout} className="w-full flex items-center gap-3 px-3 py-2.5 border-t border-white/5 mt-1 rounded-lg text-sm text-[#FF7A7A] hover:bg-[#FF5252]/10"><LogOut className="w-4 h-4"/>Se déconnecter</button>
      </div>}
      </div>
    </div>
  );
}

function buildNotifications(summary) {
  if (!summary) return [];
  const out = [];
  if (!summary.kpis?.active_accounts) out.push({ text: "Ajoute ton premier compte pour commencer le suivi.", to: "/app/accounts" });
  else if (!summary.kpis?.total_trades) out.push({ text: "Journalise ton premier trade pour activer les analyses.", to: "/app/journal" });
  if (summary.metrics?.plan_respect_rate < 80 && summary.kpis?.total_trades) out.push({ text: `Plan respecté sur ${summary.metrics.plan_respect_rate}% des trades. Consulte ta discipline.`, to: "/app/discipline" });
  return out;
}
