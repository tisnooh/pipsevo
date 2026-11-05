import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { hasAnalyticsConsent } from "@/lib/cookieConsent";
import { canLoadAnalytics } from "@/lib/authUrlPrivacy";

const featureFromPath = (pathname) => pathname.split("/").filter(Boolean).slice(0, 2).join(".") || "landing";

const dismissedAnnouncements = () => {
  try {
    const stored = JSON.parse(window.localStorage.getItem("pipsevo.dismissed-announcements") || "[]");
    return new Set(Array.isArray(stored) ? stored : []);
  } catch {
    try { window.localStorage.removeItem("pipsevo.dismissed-announcements"); } catch { /* Browser storage is optional. */ }
    return new Set();
  }
};

export function ProductTelemetry() {
  const { user } = useAuth();
  const { pathname, search, hash } = useLocation();
  const [analyticsAllowed, setAnalyticsAllowed] = useState(hasAnalyticsConsent);
  useEffect(() => {
    const refresh = () => setAnalyticsAllowed(hasAnalyticsConsent());
    window.addEventListener("pipsevo:cookie-consent-changed", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("pipsevo:cookie-consent-changed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  useEffect(() => {
    if (!user?.id || user.profile_loading_error || !analyticsAllowed || !canLoadAnalytics({ pathname, search, hash }) || (!pathname.startsWith("/app/") && !pathname.startsWith("/admin/"))) return undefined;
    const timer = window.setTimeout(() => {
      if (!hasAnalyticsConsent()) return;
      const feature = featureFromPath(pathname);
      api.post("/product-events", {
        event_name: "page.viewed",
        feature,
        metadata: { pathname: `/${feature.replace(".", "/")}` },
      }).catch(() => {});
    }, 600);
    return () => window.clearTimeout(timer);
  }, [pathname, search, hash, user?.id, user?.profile_loading_error, analyticsAllowed]);
  return null;
}

export function AnnouncementBanner() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    let active = true;
    api.get("/announcements/active").then(({ data }) => {
      if (!active) return;
      const dismissed = dismissedAnnouncements();
      setItems((data.items || []).filter((item) => !dismissed.has(item.id)));
    }).catch(() => {});
    return () => { active = false; };
  }, []);
  if (!items.length) return null;
  const dismiss = (id) => {
    const dismissed = dismissedAnnouncements();
    dismissed.add(id);
    try { window.localStorage.setItem("pipsevo.dismissed-announcements", JSON.stringify([...dismissed].slice(-100))); }
    catch { /* Hide the announcement for this session even without persistence. */ }
    setItems((current) => current.filter((item) => item.id !== id));
  };
  return <section className="pe-announcements" aria-label="Annonces PipsEvo">{items.map((item) => <article key={item.id} className={`pe-announcement pe-announcement-${item.type}`}><div><strong>{item.title}</strong><span>{item.message}</span></div>{item.dismissible && <button onClick={() => dismiss(item.id)} aria-label="Masquer l’annonce"><X /></button>}</article>)}</section>;
}
