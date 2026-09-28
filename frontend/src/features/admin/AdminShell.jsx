import React, { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Activity, BarChart3, BellRing, Cable, ChevronLeft, CreditCard, Database,
  FileClock, Flag, Headphones, LayoutDashboard, LogOut, Menu, Search,
  Settings, UserCircle, Users, X,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/context/AuthContext";
import { adminApi, isSuperAdmin } from "./api";
import { useAdminSession } from "./AdminAccess";
import "./admin.css";

const navigation = [
  ["/admin", "Dashboard", LayoutDashboard, "overview.read"],
  ["/admin/users", "Utilisateurs", Users, "users.support_read|users.read"],
  ["/admin/subscriptions", "Abonnements", CreditCard, "subscriptions.read"],
  ["/admin/trading-accounts", "Comptes de trading", Activity, "trading_accounts.read"],
  ["/admin/integrations", "Intégrations", Cable, "integrations.read"],
  ["/admin/support", "Support", Headphones, "support.read"],
  ["/admin/analytics", "Analytics", BarChart3, "analytics.read"],
  ["/admin/announcements", "Annonces", BellRing, "announcements.read"],
  ["/admin/feature-flags", "Feature flags", Flag, "*"],
  ["/admin/audit-logs", "Journal d’audit", FileClock, "*"],
  ["/admin/system", "Système", Database, "system.read"],
  ["/admin/settings", "Paramètres", Settings, "*"],
];

const permissionMatches = (session, required) => {
  const values = session?.permissions || [];
  return values.includes("*") || required.split("|").some((item) => values.includes(item));
};

export default function AdminShell() {
  const session = useAdminSession();
  const { logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobile, setMobile] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const links = useMemo(() => navigation.filter(([, , , permission]) => permissionMatches(session, permission)), [session]);

  useEffect(() => { setMobile(false); setResults(null); setQuery(""); }, [location.pathname]);
  useEffect(() => {
    if (query.trim().length < 2) { setResults(null); return undefined; }
    const timer = window.setTimeout(() => adminApi.search(query.trim()).then(({ data }) => setResults(data)).catch(() => setResults(null)), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  return <div className="admin-shell">
    {mobile && <button className="admin-backdrop" aria-label="Fermer le menu" onClick={() => setMobile(false)} />}
    <aside className={`admin-sidebar ${mobile ? "is-open" : ""}`}>
      <div className="admin-brand"><Logo size="sm" /><button onClick={() => setMobile(false)} aria-label="Fermer"><X /></button></div>
      <div className="admin-label">PIPSEVO ADMIN</div>
      <nav>{links.map(([to, label, Icon]) => <NavLink key={to} end={to === "/admin"} to={to} className={({ isActive }) => isActive ? "active" : ""}><Icon />{label}</NavLink>)}</nav>
      <div className="admin-sidebar-foot"><span>{session?.name || session?.email}</span><small>{session?.role?.replace("_", " ")}</small><button onClick={() => navigate("/admin/settings")}><UserCircle /> Profil administrateur</button><button onClick={() => navigate("/app/dashboard")}><ChevronLeft /> Retour à PipsEvo</button><button className="admin-logout" onClick={async () => { await logout("local"); window.location.href = "/login"; }}><LogOut /> Déconnexion</button></div>
    </aside>
    <section className="admin-main">
      <header className="admin-topbar">
        <button className="admin-menu" onClick={() => setMobile(true)} aria-label="Ouvrir le menu"><Menu /></button>
        <div className="admin-search"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher un utilisateur, ticket ou prop firm…" />
          {results && <div className="admin-search-results">
            {[...(results.users || []).map((item) => ({ label: item.email || item.name, to: `/admin/users/${item.id}` })), ...(results.support || []).map((item) => ({ label: `${item.id} · ${item.subject}`, to: `/admin/support/${item.id}` })), ...(results.prop_firms || []).map((item) => ({ label: item.name, to: "/admin/prop-firms" }))].slice(0, 12).map((item) => <button key={`${item.to}-${item.label}`} onClick={() => navigate(item.to)}>{item.label}</button>)}
          </div>}
        </div>
        <div className="admin-role"><span className="admin-live" />{isSuperAdmin(session) ? "Accès total" : session?.role}</div>
      </header>
      <main className="admin-content"><Outlet /></main>
    </section>
  </div>;
}
