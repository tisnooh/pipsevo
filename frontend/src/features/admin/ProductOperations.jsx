import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

const featureFromPath = (pathname) => pathname.split("/").filter(Boolean).slice(0, 2).join(".") || "landing";

const dismissedAnnouncements = () => {
  try {
    const stored = JSON.parse(window.localStorage.getItem("pipsevo.dismissed-announcements") || "[]");
    return new Set(Array.isArray(stored) ? stored : []);
  } catch {
    window.localStorage.removeItem("pipsevo.dismissed-announcements");
    return new Set();
  }
};

export function ProductTelemetry() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  useEffect(() => {
    if (!user || (!pathname.startsWith("/app") && !pathname.startsWith("/admin"))) return undefined;
    const timer = window.setTimeout(() => {
      api.post("/product-events", {
        event_name: "page.viewed",
        feature: featureFromPath(pathname),
        metadata: { pathname },
      }).catch(() => {});
    }, 600);
    return () => window.clearTimeout(timer);
  }, [pathname, user]);
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
    window.localStorage.setItem("pipsevo.dismissed-announcements", JSON.stringify([...dismissed].slice(-100)));
    setItems((current) => current.filter((item) => item.id !== id));
  };
  return <section className="pe-announcements" aria-label="Annonces PipsEvo">{items.map((item) => <article key={item.id} className={`pe-announcement pe-announcement-${item.type}`}><div><strong>{item.title}</strong><span>{item.message}</span></div>{item.dismissible && <button onClick={() => dismiss(item.id)} aria-label="Masquer l’annonce"><X /></button>}</article>)}</section>;
}
