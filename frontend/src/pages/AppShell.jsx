import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { LayoutDashboard, Wallet, BookOpen, Shield, BarChart3, Banknote, Brain, Dna, Settings as Cog, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const links = [
  { to: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard, testid: "nav-dashboard" },
  { to: "/app/accounts", label: "Accounts", icon: Wallet, testid: "nav-accounts" },
  { to: "/app/journal", label: "Journal", icon: BookOpen, testid: "nav-journal" },
  { to: "/app/discipline", label: "Discipline", icon: Shield, testid: "nav-discipline" },
  { to: "/app/analytics", label: "Analytics", icon: BarChart3, testid: "nav-analytics" },
  { to: "/app/payouts", label: "Payouts", icon: Banknote, testid: "nav-payouts" },
  { to: "/app/coach", label: "AI Coach", icon: Brain, testid: "nav-coach" },
  { to: "/app/dna", label: "Trading DNA", icon: Dna, testid: "nav-dna" },
  { to: "/app/settings", label: "Settings", icon: Cog, testid: "nav-settings" },
];

export default function AppShell() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  return (
    <div className="min-h-screen bg-[#050505] text-white flex">
      <aside className="w-64 border-r border-white/5 p-4 flex flex-col gap-1 sticky top-0 h-screen">
        <div className="px-3 py-4 font-bold text-xl tracking-tight">PipsEvo<span className="text-[#4F8CFF]">.</span></div>
        <nav className="flex-1 mt-2 flex flex-col gap-1">
          {links.map(({ to, label, icon: Icon, testid }) => (
            <NavLink key={to} to={to} data-testid={testid} end className={({isActive}) => `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition ${isActive?"bg-gradient-to-r from-[#4F8CFF]/15 to-[#7C4DFF]/10 text-white border border-[#4F8CFF]/20":"text-[#9CA3AF] hover:text-white hover:bg-white/5"}`}>
              <Icon className="w-4 h-4" /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-white/5 pt-3 px-2 text-xs text-[#9CA3AF]">
          <div className="truncate" data-testid="sidebar-user">{user?.name || user?.email}</div>
          <button onClick={() => { logout(); nav("/"); }} className="flex items-center gap-2 mt-2 text-[#FF5252] hover:underline" data-testid="sidebar-logout"><LogOut className="w-3.5 h-3.5"/> Logout</button>
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
