import { useState } from "react"
import { Link, useLocation, Outlet } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
  LayoutDashboard, Wallet, BookOpen, BarChart2, BarChart3,
  Bot, Shield, DollarSign, FileText, Settings, LogOut, Bell,
  Search, Plus, ChevronDown, Crown
} from "lucide-react"

const navItems = [
  { icon: LayoutDashboard, label: "Aperçu", path: "/app" },
  { icon: Wallet, label: "Comptes", path: "/app/accounts" },
  { icon: BookOpen, label: "Journal", path: "/app/journal" },
  { icon: BarChart2, label: "Backtest", path: "/app/backtest" },
  { icon: BarChart3, label: "Statistiques", path: "/app/stats" },
  { icon: Bot, label: "Analyse IA", path: "/app/ai" },
  { icon: Shield, label: "Discipline", path: "/app/discipline" },
  { icon: DollarSign, label: "Payouts", path: "/app/payouts" },
  { icon: FileText, label: "Rapports", path: "/app/reports" },
  { icon: Settings, label: "Paramètres", path: "/app/settings" },
]


export function AppLayout({ children }) {
  const location = useLocation()
  const [_searchOpen, setSearchOpen] = useState(false)

  return (
    <div className="flex h-screen bg-[#070914] overflow-hidden">
      {/* Sidebar */}
      <div className="w-[190px] flex-shrink-0 flex flex-col border-r border-[#1E2430] relative" style={{ background: "linear-gradient(180deg, #0A0C14 0%, #070914 100%)" }}>
        {/* Top edge glow */}
        <div className="absolute top-0 left-0 right-0 h-px bg-[#7C4DFF] opacity-20" />
        {/* Side glow */}
        <div className="absolute top-0 bottom-0 right-0 w-px bg-[#7C4DFF] opacity-10" />
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 py-4 border-b border-[#1E2430]">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center relative"
            style={{
              background: "linear-gradient(135deg, #7C4DFF, #4F8CFF)",
              boxShadow: "0 0 16px rgba(124, 77, 255, 0.35)",
            }}
          >
            <div className="w-3.5 h-3.5 border-[2.5px] border-white rounded-[3px] opacity-95" />
            {/* Glow orb */}
            <div className="absolute -inset-1 rounded-xl opacity-40 pointer-events-none" style={{ background: "radial-gradient(circle, rgba(124,77,255,0.4), transparent 70%)" }} />
          </div>
          <div>
            <span className="text-lg font-bold text-white tracking-tight">PipsEvo.</span>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto scrollbar-thin">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== "/app" && location.pathname.startsWith(item.path))
            return (
              <Link
                key={item.path}
                to={item.path}
                className="relative flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all group"
              >
                {/* Active state: full background glow */}
                {isActive && (
                  <div
                    className="absolute inset-0 rounded-xl"
                    style={{
                      background: "linear-gradient(135deg, rgba(124,77,255,0.22), rgba(79,140,255,0.08))",
                      border: "1px solid rgba(124,77,255,0.25)",
                      boxShadow: "0 0 20px rgba(124,77,255,0.12), inset 0 1px 0 rgba(255,255,255,0.04)",
                    }}
                  />
                )}
                {/* Left indicator line */}
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-[#7C4DFF]" style={{ boxShadow: "0 0 8px rgba(124,77,255,0.6)" }} />
                )}
                {/* Icon container */}
                <div className={`relative z-10 w-[22px] h-[22px] rounded-md flex items-center justify-center transition-all ${isActive ? "" : "group-hover:bg-[rgba(124,77,255,0.08)]"}`}>
                  <item.icon className={`w-4 h-4 relative z-10 transition-all ${isActive ? "text-[#7C4DFF]" : "text-[#9CA3AF] group-hover:text-white"}`} />
                </div>
                <span className={`relative z-10 transition-all ${isActive ? "text-white font-semibold" : "text-[#9CA3AF] group-hover:text-white"}`}>
                  {item.label}
                </span>
              </Link>
            )
          })}
        </nav>

        {/* Bottom sidebar */}
        <div className="px-2 py-3 border-t border-[#1E2430] space-y-2">
          {/* Discipline score */}
          <div
            className="p-3 rounded-xl"
            style={{
              background: "rgba(15, 17, 23, 0.85)",
              border: "1px solid rgba(0, 230, 118, 0.12)",
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.03)",
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] text-[#9CA3AF] font-medium tracking-wide uppercase">Discipline du jour</p>
              <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "rgba(0, 230, 118, 0.12)" }}>
                <Shield className="w-2.5 h-2.5 text-[#00E676]" />
              </div>
            </div>
            <div className="flex items-end gap-1.5 mb-1">
              <span className="text-[28px] font-bold text-white tracking-tight leading-none">94</span>
              <span className="text-xs text-[#9CA3AF] font-medium mb-1">/100</span>
            </div>
            <p className="text-[10px] text-[#00E676] font-semibold mb-2">Excellent</p>
            <div className="h-[28px]">
              <svg width="100%" height="28" viewBox="0 0 120 28">
                <polyline
                  points="0,24 15,21 30,19 45,17 60,14 75,11 90,9 105,7 120,4"
                  fill="none"
                  stroke="url(#discLine)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <defs>
                  <linearGradient id="discLine" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#4F8CFF" />
                    <stop offset="100%" stopColor="#00E676" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>

          {/* Upgrade card */}
          <div
            className="p-3 rounded-xl"
            style={{
              background: "linear-gradient(135deg, rgba(124, 77, 255, 0.08), rgba(79, 140, 255, 0.04))",
              border: "1px solid rgba(124, 77, 255, 0.2)",
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.4), 0 0 12px rgba(124, 77, 255, 0.06)",
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "rgba(124, 77, 255, 0.2)" }}>
                <Crown className="w-3 h-3 text-[#7C4DFF]" />
              </div>
              <p className="text-xs font-semibold text-white">Passe a Pro</p>
            </div>
            <p className="text-[10px] text-[#9CA3AF] leading-relaxed mb-2.5">Plus d'analyses. Plus d'insights. Plus de payouts.</p>
            <button
              className="w-full py-2 rounded-lg text-[10px] font-semibold text-white transition-all hover:opacity-90"
              style={{
                background: "linear-gradient(135deg, #7C4DFF, #4F8CFF)",
                boxShadow: "0 4px 12px rgba(124, 77, 255, 0.3)",
              }}
            >
              Mettre a niveau →
            </button>
          </div>

          {/* User */}
          <div
            className="flex items-center gap-2.5 p-2.5 rounded-xl cursor-pointer transition-all hover:scale-[1.02]"
            style={{
              background: "rgba(15, 17, 23, 0.85)",
              border: "1px solid rgba(30, 36, 48, 0.6)",
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.4)",
            }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
              style={{
                background: "linear-gradient(135deg, #7C4DFF, #4F8CFF)",
                boxShadow: "0 0 8px rgba(124, 77, 255, 0.3)",
              }}
            >
              I
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">Itiel</p>
              <div className="flex items-center gap-1">
                <span className="px-1.5 py-0.5 rounded bg-[#7C4DFF]/20 text-[#7C4DFF] text-[8px] font-bold tracking-wider uppercase">PRO</span>
              </div>
            </div>
          </div>

          {/* Logout */}
          <button className="flex items-center gap-2.5 px-3 py-2.5 w-full text-sm text-[#9CA3AF] hover:text-white transition-all rounded-xl hover:bg-[rgba(255,82,82,0.06)] group">
            <LogOut className="w-4 h-4 text-[#9CA3AF] group-hover:text-[#FF5252] transition-colors" />
            <span className="text-[11px] font-medium">Deconnexion</span>
          </button>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-[#1E2430]" style={{ background: "rgba(7, 9, 20, 0.95)", backdropFilter: "blur(12px)" }}>
          <div className="flex items-center gap-3">
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#1E2430] text-sm text-[#9CA3AF] cursor-pointer hover:border-[#7C4DFF]/40 transition-all group"
              style={{ background: "rgba(15, 17, 23, 0.85)", boxShadow: "0 4px 16px rgba(0, 0, 0, 0.3)" }}
              onClick={() => setSearchOpen(true)}
            >
              <Search className="w-3.5 h-3.5 text-[#9CA3AF] group-hover:text-[#7C4DFF] transition-colors" />
              <span className="text-[#9CA3AF] group-hover:text-white transition-colors">Rechercher...</span>
              <kbd className="ml-3 px-2 py-0.5 rounded-md border border-[#1E2430] bg-[#0A0C14] text-[10px] text-[#9CA3AF] font-mono">⌘K</kbd>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Date filter */}
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#1E2430] text-sm text-white cursor-pointer hover:border-[#7C4DFF]/40 transition-all group"
              style={{ background: "rgba(15, 17, 23, 0.85)", boxShadow: "0 4px 16px rgba(0, 0, 0, 0.3)" }}
            >
              <span className="text-[#E5E7EB] text-xs font-medium">30 derniers jours</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#9CA3AF] group-hover:text-[#7C4DFF] transition-colors" />
            </div>

            {/* Notifications */}
            <button
              className="relative w-9 h-9 rounded-xl border border-[#1E2430] flex items-center justify-center hover:border-[#7C4DFF]/40 transition-all group"
              style={{ background: "rgba(15, 17, 23, 0.85)", boxShadow: "0 4px 16px rgba(0, 0, 0, 0.3)" }}
            >
              <Bell className="w-4 h-4 text-[#9CA3AF] group-hover:text-[#7C4DFF] transition-colors" />
              <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#7C4DFF]" style={{ boxShadow: "0 0 6px rgba(124, 77, 255, 0.5)" }} />
            </button>

            {/* User badge */}
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#1E2430] cursor-pointer hover:border-[#7C4DFF]/40 transition-all group"
              style={{ background: "rgba(15, 17, 23, 0.85)", boxShadow: "0 4px 16px rgba(0, 0, 0, 0.3)" }}
            >
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                style={{
                  background: "linear-gradient(135deg, #7C4DFF, #4F8CFF)",
                }}
              >
                I
              </div>
              <span className="text-sm text-white font-medium">Itiel</span>
              <span className="px-1.5 py-0.5 rounded-md bg-[#7C4DFF]/20 text-[#7C4DFF] text-[10px] font-bold tracking-wider uppercase">PRO</span>
            </div>

            {/* Add account */}
            <button
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[11px] font-semibold text-white transition-all hover:opacity-90 hover:shadow-lg"
              style={{
                background: "linear-gradient(135deg, #7C4DFF, #4F8CFF)",
                boxShadow: "0 4px 15px rgba(124, 77, 255, 0.3)",
              }}
            >
              <Plus className="w-3.5 h-3.5" />
              Ajouter un compte
            </button>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
