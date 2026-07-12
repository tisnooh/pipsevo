import React, { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Home, Wallet, BookOpen, FlaskConical, BarChart3, Brain, Shield, Banknote, FileText, Settings as Cog, LogOut, Search, Bell, Crown } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { LogoMark } from "@/components/Logo";
import { dashboard } from "@/lib/api";

const links = [
  { to: "/app/dashboard", label: "Aperçu", icon: Home, testid: "nav-dashboard" },
  { to: "/app/accounts", label: "Comptes", icon: Wallet, testid: "nav-accounts" },
  { to: "/app/journal", label: "Journal", icon: BookOpen, testid: "nav-journal" },
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
  const [discipline, setDiscipline] = useState(94);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => { dashboard().then(r => setDiscipline(r.data?.kpis?.discipline_score ?? 94)).catch(()=>{}); }, []);

  return (
    <div className="min-h-screen bg-[#050505] text-white lg:flex">
      {/* Overlay mobile derrière le menu */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* SIDEBAR */}
      <aside className={`fixed lg:sticky top-0 left-0 z-50 lg:z-auto w-72 lg:w-64 h-screen border-r border-white/5 flex flex-col bg-[#050505] transition-transform duration-300 ease-out ${mobileOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}>
        <div className="px-5 py-5 flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <LogoMark />
            <span className="font-bold text-lg">PipsEvo<span className="text-[#7C4DFF]">.</span></span>
          </div>
          <button onClick={() => setMobileOpen(false)} className="lg:hidden w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center text-[#9CA3AF]" aria-label="Fermer le menu">✕</button>
        </div>
        <nav className="flex-1 px-3 flex flex-col gap-0.5 overflow-y-auto">
          {links.map(({ to, label, icon: Icon, testid }) => (
            <NavLink key={to} to={to} onClick={() => setMobileOpen(false)} data-testid={testid} end className={({isActive}) => `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition ${isActive?"bg-[#7C4DFF]/20 text-white border border-[#7C4DFF]/30 shadow-[0_0_20px_-6px_rgba(124,77,255,0.5)]":"text-[#9CA3AF] hover:text-white hover:bg-white/[0.04]"}`}>
              <Icon className="w-[18px] h-[18px]" /> {label}
            </NavLink>
          ))}
        </nav>

        {/* Discipline du jour mini card */}
        <div className="px-3 mt-3">
          <div className="card-flat p-4 text-center">
            <div className="text-[10px] font-mono uppercase tracking-widest text-[#9CA3AF]">Discipline du jour</div>
            <div className="relative mt-2 mb-1">
              <svg viewBox="0 0 80 50" className="w-full h-12 mx-auto">
                <defs>
                  <linearGradient id="gauge-a" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#7C4DFF"/><stop offset="100%" stopColor="#B58BFF"/></linearGradient>
                </defs>
                <path d="M10 40 A30 30 0 0 1 70 40" stroke="#1E2430" strokeWidth="6" fill="none" strokeLinecap="round" />
                <path d="M10 40 A30 30 0 0 1 70 40" stroke="url(#gauge-a)" strokeWidth="6" fill="none" strokeLinecap="round" strokeDasharray="95" strokeDashoffset={95 - (discipline/100)*95} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center pt-1">
                <div className="text-xl font-bold font-mono">{discipline}<span className="text-xs text-[#9CA3AF]">/100</span></div>
              </div>
            </div>
            <div className="text-[10px] text-[#00E676]">Excellent</div>
            <svg viewBox="0 0 80 18" className="w-full h-4 mt-2">
              <path d="M0,15 L10,12 L20,13 L30,9 L40,10 L50,6 L60,7 L70,3 L80,4" stroke="#7C4DFF" strokeWidth="1.5" fill="none"/>
            </svg>
          </div>
        </div>

        {/* Upgrade card */}
        <div className="px-3 mt-3 mb-2">
          <div className="card-flat p-4">
            <div className="text-sm font-semibold">Passe à Pro</div>
            <div className="text-[10px] text-[#9CA3AF] mt-1">Plus d'analyses. Plus d'insights.<br/>Plus de payouts.</div>
            <button onClick={() => nav("/app/settings")} className="mt-3 w-full text-xs py-2 rounded-lg bg-gradient-to-r from-[#7C4DFF] to-[#5A2DFF] hover:opacity-90 transition font-semibold" data-testid="sidebar-upgrade">Mettre à niveau →</button>
          </div>
        </div>

        <div className="border-t border-white/5 px-3 py-3 text-xs text-[#9CA3AF]">
          <button onClick={() => { logout(); window.location.href = "/"; }} className="flex items-center gap-2 hover:text-[#FF5252]" data-testid="sidebar-logout"><LogOut className="w-3.5 h-3.5"/> Déconnexion</button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 min-w-0 w-full">
        <TopBar user={user} onMenuClick={() => setMobileOpen(true)} />
        <Outlet />
      </main>
    </div>
  );
}

function TopBar({ user, onMenuClick }) {
  return (
    <div className="sticky top-0 z-30 bg-[#050505]/80 backdrop-blur-xl border-b border-white/5 px-4 sm:px-6 py-3 flex items-center gap-3 sm:gap-4">
      <button onClick={onMenuClick} className="lg:hidden w-9 h-9 shrink-0 rounded-xl hover:bg-white/5 flex items-center justify-center text-[#9CA3AF]" aria-label="Ouvrir le menu" data-testid="top-menu-toggle">
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
      </button>
      <div className="flex-1 min-w-0 max-w-md relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
        <input placeholder="Rechercher…" data-testid="top-search" className="w-full bg-[#0D1020] border border-white/5 rounded-xl pl-10 pr-3 sm:pr-12 py-2 text-sm placeholder:text-[#6B7280] focus:border-[#7C4DFF]/40" />
        <kbd className="hidden sm:block absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-[#6B7280] border border-white/10 rounded px-1.5 py-0.5">⌘K</kbd>
      </div>
      <div className="hidden sm:flex flex-1" />
      <button className="relative w-9 h-9 shrink-0 rounded-xl hover:bg-white/5 flex items-center justify-center" data-testid="top-notifs">
        <Bell className="w-4 h-4 text-[#9CA3AF]" />
        <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-[#FF4FD8] rounded-full" />
      </button>
      <div className="flex items-center gap-2 px-2 py-1.5 rounded-xl border border-white/10 bg-[#0D1020] shrink-0">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#7C4DFF] to-[#4F8CFF] flex items-center justify-center text-xs font-bold">{(user?.name||user?.email||"U")[0].toUpperCase()}</div>
        <div className="hidden sm:block text-sm font-medium" data-testid="top-username">{user?.name || user?.email}</div>
        <span className="hidden sm:inline text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded bg-[#7C4DFF]/20 text-[#B58BFF] border border-[#7C4DFF]/30">PRO</span>
      </div>
    </div>
  );
}
