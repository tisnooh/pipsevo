import React, { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Activity, AlertTriangle, BarChart3, BellRing, Building2, ChevronLeft, CreditCard,
  FileClock, Flag, FlaskConical, Headphones, LayoutDashboard, Mail, Menu, Search,
  Settings, Sparkles, Users, X, Zap,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { adminApi, isSuperAdmin } from "./api";
import { useAdminSession } from "./AdminAccess";
import "./admin.css";

const navigation = [
  ["/admin", "Vue d’ensemble", LayoutDashboard, "overview.read"],
  ["/admin/users", "Utilisateurs", Users, "users.support_read|users.read"],
  ["/admin/support", "Support", Headphones, "support.read"],
  ["/admin/trading-sync", "Synchronisations", Zap, "sync.read"],
  ["/admin/prop-firms", "Prop firms", Building2, "prop_firms.read"],
  ["/admin/emails", "E-mails", Mail, "emails.read"],
  ["/admin/atlas", "Atlas IA", Sparkles, "atlas.read"],
  ["/admin/backtesting", "Backtest Lab", FlaskConical, "backtest.read"],
  ["/admin/analytics", "Analytics", BarChart3, "analytics.read"],
  ["/admin/subscriptions", "Abonnements", CreditCard, "subscriptions.read"],
  ["/admin/announcements", "Annonces", BellRing, "announcements.read"],
  ["/admin/feature-flags", "Feature flags", Flag, "*"],
  ["/admin/incidents", "Incidents", AlertTriangle, "incidents.read"],
  ["/admin/audit", "Journal d’audit", FileClock, "*"],
  ["/admin/settings", "Réglages", Settings, "*"],
];

const permissionMatches = (session, required) => {
  const values = session?.permissions || [];
  return values.includes("*") || required.split("|").some((item) => values.includes(item));
};

export default function AdminShell() {
  const session = useAdminSession();
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
      <div className="admin-label">CONTROL CENTER</div>
      <nav>{links.map(([to, label, Icon]) => <NavLink key={to} end={to === "/admin"} to={to} className={({ isActive }) => isActive ? "active" : ""}><Icon />{label}</NavLink>)}</nav>
      <div className="admin-sidebar-foot"><span>{session?.name || session?.email}</span><small>{session?.role?.replace("_", " ")}</small><button onClick={() => navigate("/app/dashboard")}><ChevronLeft /> Retour à PipsEvo</button></div>
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
