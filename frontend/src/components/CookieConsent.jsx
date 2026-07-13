import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Cookie, X } from "lucide-react";

const CONSENT_KEY = "pipsevo_analytics_consent";

function loadAnalytics() {
  if (document.getElementById("pipsevo-posthog") || window.posthog?.__SV) return;
  const script = document.createElement("script");
  script.id = "pipsevo-posthog";
  script.src = "/posthog-loader.js";
  script.async = true;
  document.head.appendChild(script);
}

export default function CookieConsent() {
  const [open, setOpen] = useState(() => !localStorage.getItem(CONSENT_KEY));
  useEffect(() => {
    if (localStorage.getItem(CONSENT_KEY) === "accepted") loadAnalytics();
    const reopen = () => setOpen(true);
    window.addEventListener("pipsevo:cookie-settings", reopen);
    return () => window.removeEventListener("pipsevo:cookie-settings", reopen);
  }, []);

  const choose = (value) => {
    localStorage.setItem(CONSENT_KEY, value);
    if (value === "accepted") loadAnalytics();
    else window.posthog?.opt_out_capturing?.();
    setOpen(false);
  };

  if (!open) return null;
  return <div role="dialog" aria-modal="true" aria-label="Préférences de confidentialité" className="fixed inset-x-3 bottom-3 z-[100] mx-auto max-w-3xl rounded-2xl border border-white/10 bg-[#0B0E18]/95 p-4 sm:p-5 shadow-2xl backdrop-blur-xl">
    <div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#7C4DFF]/15 text-[#B58BFF]"><Cookie className="h-5 w-5"/></span><div className="min-w-0 flex-1"><div className="font-semibold">Tes préférences de confidentialité</div><p className="mt-1 text-xs leading-relaxed text-[#9CA3AF]">Les cookies nécessaires assurent la connexion et la sécurité. Avec ton accord, des statistiques d’usage nous aident à améliorer PipsEvo. L’enregistrement de session est désactivé.</p><Link to="/privacy" className="mt-2 inline-block text-xs text-[#B58BFF] hover:text-white">Consulter la politique de confidentialité</Link></div><button onClick={()=>setOpen(false)} aria-label="Fermer sans choisir" className="grid h-8 w-8 place-items-center rounded-lg text-[#7E8798] hover:bg-white/5 hover:text-white"><X className="h-4 w-4"/></button></div>
    <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button onClick={()=>choose("refused")} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-[#B5BBC9] hover:bg-white/5">Refuser les statistiques</button><button onClick={()=>choose("accepted")} className="btn-primary px-4 py-2.5 text-sm">Accepter les statistiques</button></div>
  </div>;
}

export const openCookieSettings = () => window.dispatchEvent(new Event("pipsevo:cookie-settings"));
