import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Lock, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { BILLING_CONFIG, COMMERCIAL_PHASES, canUseFeature, formatBillingPrice, launchOfferCopy } from "@/config/billing";
import { captureCommercialEvent } from "@/lib/commercialAnalytics";

export function FeatureGate({ feature, children, label = "cette fonctionnalité", className = "" }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const closeRef = useRef(null);
  const allowed = canUseFeature(user, feature);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => event.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);
  if (allowed) return children;
  const show = () => { setOpen(true); captureCommercialEvent("locked_feature_clicked", { feature }); };
  const launch = launchOfferCopy();
  return <>
    <button type="button" onClick={show} className={`relative text-left ${className}`} aria-label={`${label} — bientôt disponible`}>
      <span className="pointer-events-none opacity-55">{children}</span>
      <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full border border-[#7C4DFF]/30 bg-[#090B13]/95 px-2 py-1 text-[9px] text-[#C8AEFF]"><Lock className="h-3 w-3"/>Bientôt disponible</span>
    </button>
    {open && <div className="fixed inset-0 z-[120] grid place-items-center bg-black/75 p-4 backdrop-blur-sm" onMouseDown={(e)=>e.target===e.currentTarget&&setOpen(false)}>
      <div data-motion-item data-motion-surface role="dialog" aria-modal="true" aria-labelledby="locked-feature-title" className="relative w-full max-w-md rounded-3xl border border-white/10 bg-[#0B0E18] p-6 shadow-2xl sm:p-7">
        <button ref={closeRef} type="button" onClick={()=>setOpen(false)} aria-label="Fermer" className="absolute right-4 top-4 rounded-lg p-2 text-[#8B93A3] hover:bg-white/5 hover:text-white focus-visible:ring-2 focus-visible:ring-[#7C4DFF]"><X className="h-4 w-4"/></button>
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#7C4DFF]/15 text-[#C8AEFF]"><Lock className="h-5 w-5"/></span>
        <h2 id="locked-feature-title" className="mt-5 pr-8 text-xl font-bold">Débloque {label} avec PipsEvo Pro</h2>
        <p className="mt-3 text-sm leading-relaxed text-[#9CA3AF]">{BILLING_CONFIG.currentPhase === COMMERCIAL_PHASES.BETA ? "Cette fonctionnalité avancée sera disponible lors du lancement officiel de PipsEvo." : BILLING_CONFIG.currentPhase === COMMERCIAL_PHASES.LAUNCH_OFFER ? `${launch.title} ${launch.detail}` : `Cette fonctionnalité est incluse dans le plan Pro à ${formatBillingPrice(BILLING_CONFIG.prices.pro)}/mois.`}</p>
        <Link to="/pricing" onClick={()=>captureCommercialEvent("pro_clicked", { source: "locked_feature", feature })} className="btn-primary mt-6 block w-full text-center">Voir PipsEvo Pro</Link>
      </div>
    </div>}
  </>;
}

export const LockedFeature = FeatureGate;
