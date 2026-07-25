import React from "react";
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { BILLING_CONFIG, COMMERCIAL_PHASES, launchOfferCopy } from "@/config/billing";
import { captureCommercialEvent } from "@/lib/commercialAnalytics";

export default function CommercialBanner({ placement = "app" }) {
  const phase = BILLING_CONFIG.currentPhase;
  const launch = launchOfferCopy();
  const content = phase === COMMERCIAL_PHASES.BETA
    ? { badge: "Bêta gratuite", text: "Certaines fonctionnalités avancées sont encore en développement.", cta: "Voir la roadmap" }
    : phase === COMMERCIAL_PHASES.LAUNCH_OFFER
      ? { badge: "Offre de lancement", text: `${launch.title} ${launch.detail}`, cta: "Débloquer Pro" }
      : { badge: "PipsEvo", text: "Choisis le plan adapté à ton trading.", cta: "Voir les offres" };

  return <aside className="flex flex-col gap-3 rounded-2xl border border-[#7C4DFF]/25 bg-gradient-to-r from-[#7C4DFF]/10 via-[#111426] to-[#4F8CFF]/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between" aria-label={content.badge}>
    <div className="flex min-w-0 items-start gap-3 sm:items-center">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#7C4DFF]/15 text-[#C8AEFF]"><Sparkles className="h-4 w-4"/></span>
      <p className="text-xs leading-relaxed text-[#B5BBC9]"><strong className="mr-2 text-white">{content.badge}</strong>{content.text}</p>
    </div>
    <Link to="/pricing" onClick={()=>captureCommercialEvent(phase === COMMERCIAL_PHASES.LAUNCH_OFFER ? "beta_offer_clicked" : "pricing_viewed", { placement })} className="shrink-0 rounded-xl border border-[#7C4DFF]/35 px-3 py-2 text-center text-xs font-medium text-[#C8AEFF] transition hover:border-[#7C4DFF]/70 hover:bg-[#7C4DFF]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C4DFF]">{content.cta}</Link>
  </aside>;
}
