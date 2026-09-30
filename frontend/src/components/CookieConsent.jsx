import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { BarChart3, Check, Cookie, LockKeyhole, X } from "lucide-react";
import { useI18n } from "@/context/I18nContext";
import { canLoadAnalytics } from "@/lib/authUrlPrivacy";
import {
  captureAnalyticsPageview,
  disableAnalytics,
  loadAnalytics,
  readCookieConsent,
  saveCookieConsent,
} from "@/lib/cookieConsent";

export default function CookieConsent() {
  const { t } = useI18n();
  const location = useLocation();
  const routeKey = `${location.pathname}${location.search}${location.hash}`;
  const [consent, setConsent] = useState(() => readCookieConsent());
  const [open, setOpen] = useState(() => !readCookieConsent());
  const [settingsMode, setSettingsMode] = useState(false);
  const [analytics, setAnalytics] = useState(() => readCookieConsent()?.analytics === true);
  const lastTrackedRoute = useRef("");

  useEffect(() => {
    const reopen = () => {
      const current = readCookieConsent();
      setAnalytics(current?.analytics === true);
      setSettingsMode(true);
      setOpen(true);
    };
    window.addEventListener("pipsevo:cookie-settings", reopen);
    return () => window.removeEventListener("pipsevo:cookie-settings", reopen);
  }, []);

  useEffect(() => {
    let active = true;
    if (!consent?.analytics) {
      disableAnalytics({ clearPersistence: true });
      lastTrackedRoute.current = "";
      return () => { active = false; };
    }
    if (!canLoadAnalytics(window.location)) {
      disableAnalytics({ clearPersistence: false });
      return () => { active = false; };
    }
    loadAnalytics(window.location).then((enabled) => {
      if (!active || !enabled || lastTrackedRoute.current === routeKey) return;
      captureAnalyticsPageview(window.location);
      lastTrackedRoute.current = routeKey;
    });
    return () => { active = false; };
  }, [consent, routeKey]);

  const choose = (enabled) => {
    const next = saveCookieConsent(enabled);
    setAnalytics(enabled);
    setConsent(next);
    setOpen(false);
    setSettingsMode(false);
  };

  if (!open) return null;

  if (!settingsMode) return <div role="dialog" aria-modal="true" aria-labelledby="cookie-banner-title" className="fixed inset-x-3 bottom-3 z-[100] mx-auto max-w-3xl rounded-2xl border border-white/10 bg-[#0B0E18]/95 p-4 shadow-2xl backdrop-blur-xl sm:p-5">
    <div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#7C4DFF]/15 text-[#B58BFF]"><Cookie className="h-5 w-5"/></span><div className="min-w-0 flex-1"><div id="cookie-banner-title" className="font-semibold">{t("Tes préférences de confidentialité","Your privacy preferences")}</div><p className="mt-1 text-xs leading-relaxed text-[#9CA3AF]">{t("Les stockages nécessaires assurent la connexion et les réglages. Les statistiques PostHog restent désactivées jusqu’à ton accord et l’enregistrement de session est toujours coupé.","Required storage provides sign-in and settings. PostHog analytics stays disabled until you consent, and session recording always remains off.")}</p><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1"><Link to="/cookies" className="text-xs text-[#B58BFF] hover:text-white">{t("Politique cookies","Cookie policy")}</Link><button type="button" onClick={()=>{setSettingsMode(true);setAnalytics(false)}} className="text-xs text-[#B58BFF] hover:text-white">{t("Personnaliser","Customize")}</button></div></div></div>
    <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={()=>choose(false)} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-[#B5BBC9] hover:bg-white/5">{t("Continuer sans statistiques","Continue without analytics")}</button><button type="button" onClick={()=>choose(true)} className="btn-primary px-4 py-2.5 text-sm">{t("Tout accepter","Accept all")}</button></div>
  </div>;

  return <div className="fixed inset-0 z-[110] grid place-items-end bg-black/70 p-3 backdrop-blur-sm sm:place-items-center sm:p-6" onMouseDown={(event)=>{if(event.target===event.currentTarget&&consent)setOpen(false)}}>
    <section role="dialog" aria-modal="true" aria-labelledby="cookie-settings-title" className="max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-2xl border border-white/10 bg-[#0B0E18] shadow-2xl">
      <header className="flex items-start justify-between gap-4 border-b border-white/[0.07] p-5"><div><div className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#A995FF]">{t("CONFIDENTIALITÉ","PRIVACY")}</div><h2 id="cookie-settings-title" className="mt-2 text-xl font-bold">{t("Préférences de cookies","Cookie preferences")}</h2><p className="mt-2 text-xs leading-5 text-[#8E96A7]">{t("Tu peux modifier ton choix à tout moment. Les fonctions essentielles restent toujours actives.","You can change your choice at any time. Essential features always remain active.")}</p></div>{consent&&<button type="button" onClick={()=>setOpen(false)} aria-label={t("Fermer","Close")} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[#8E96A7] hover:bg-white/5 hover:text-white"><X className="h-4 w-4"/></button>}</header>
      <div className="space-y-3 p-5">
        <div className="flex items-start gap-4 rounded-2xl border border-[#46C99A]/20 bg-[#46C99A]/[0.04] p-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#46C99A]/10 text-[#65D8AE]"><LockKeyhole className="h-5 w-5"/></span><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold">{t("Nécessaires","Necessary")}</h3><span className="inline-flex items-center gap-1 rounded-full border border-[#46C99A]/25 px-2.5 py-1 text-[10px] text-[#65D8AE]"><Check className="h-3 w-3"/>{t("Toujours actifs","Always active")}</span></div><p className="mt-2 text-xs leading-5 text-[#8E96A7]">{t("Session sécurisée, langue, préférences, consentement et fonctions demandées.","Secure session, language, preferences, consent, and requested features.")}</p></div></div>
        <label className={`flex cursor-pointer items-start gap-4 rounded-2xl border p-4 transition ${analytics?"border-[#7C4DFF]/45 bg-[#7C4DFF]/[0.07]":"border-white/[0.08] bg-white/[0.015]"}`}><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#7C4DFF]/10 text-[#B58BFF]"><BarChart3 className="h-5 w-5"/></span><span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-3"><span className="text-sm font-semibold">{t("Statistiques facultatives","Optional analytics")}</span><input type="checkbox" checked={analytics} onChange={(event)=>setAnalytics(event.target.checked)} className="h-5 w-5 accent-[#7C4DFF]"/></span><span className="mt-2 block text-xs leading-5 text-[#8E96A7]">{t("Mesure les pages vues et quelques événements produit avec PostHog. Aucun enregistrement de session, aucune publicité ciblée.","Measures page views and selected product events with PostHog. No session recording and no targeted advertising.")}</span></span></label>
        <Link to="/cookies" onClick={()=>setOpen(false)} className="inline-flex text-xs text-[#B58BFF] hover:text-white">{t("Voir la liste détaillée des stockages","View the detailed storage list")}</Link>
      </div>
      <footer className="flex flex-col-reverse gap-2 border-t border-white/[0.07] p-5 sm:flex-row sm:justify-end"><button type="button" onClick={()=>choose(false)} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-[#B5BBC9] hover:bg-white/5">{t("Tout refuser","Reject all")}</button><button type="button" onClick={()=>choose(analytics)} className="btn-primary px-4 py-2.5 text-sm">{t("Enregistrer mon choix","Save my choice")}</button></footer>
    </section>
  </div>;
}

export const openCookieSettings = () => window.dispatchEvent(new Event("pipsevo:cookie-settings"));
