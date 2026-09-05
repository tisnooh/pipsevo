import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { CountryFlag } from "@/components/PublicHeader";
import { openCookieSettings } from "@/components/CookieConsent";
import { useI18n } from "@/context/I18nContext";
import { newsletter } from "@/lib/api";
import MotionPreferenceControl from "@/components/motion/MotionPreferenceControl";

const footerGroups = (t) => [
  [t("Produit", "Product"), [
    [t("Fonctionnalités", "Features"), "/#product"],
    ["Prop Firms", "/platforms"],
    [t("Tarifs", "Pricing"), "/pricing"],
    [t("Bêta", "Beta"), "/#beta"],
  ]],
  [t("Ressources", "Resources"), [
    ["FAQ", "/faq"],
    [t("Centre d’aide", "Help center"), "/help"],
    ["Contact", "/contact"],
    [t("Guides", "Guides"), "/blog"],
  ]],
  [t("Légal", "Legal"), [
    [t("Confidentialité", "Privacy"), "/privacy"],
    [t("Conditions d’utilisation", "Terms of use"), "/terms"],
    [t("Mentions légales", "Legal notice"), "/legal-notice"],
    [t("Cookies", "Cookies"), "/cookies"],
    [t("Gestion des données", "Data rights"), "/data-rights"],
    [t("Sécurité", "Security"), "/security"],
  ]],
];

export default function PublicFooter() {
  const { language, setLanguage, t } = useI18n();
  const [email, setEmail] = useState("");
  const [newsletterState, setNewsletterState] = useState("idle");
  const [newsletterMessage, setNewsletterMessage] = useState("");

  const subscribe = async (event) => {
    event.preventDefault();
    if (newsletterState === "loading") return;
    setNewsletterState("loading");
    setNewsletterMessage("");
    try {
      await newsletter.subscribe(email, language, "public-footer");
      setEmail("");
      setNewsletterState("success");
      setNewsletterMessage(t("Vérifie ta boîte mail pour confirmer ton inscription.", "Check your inbox to confirm your subscription."));
    } catch (error) {
      setNewsletterState("error");
      setNewsletterMessage(error.response?.data?.detail || t("L’envoi a échoué. Réessaie dans quelques minutes.", "Sending failed. Try again in a few minutes."));
    }
  };

  return <footer className="border-t border-white/[0.07] bg-[#050505] px-5 py-12 sm:px-6 lg:px-10 lg:py-16">
    <div className="mx-auto grid max-w-[1280px] gap-10 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
      <div>
        <Logo size="md" />
        <p className="mt-4 max-w-xs text-sm leading-6 text-[#777F8E]">{t("Le système d’exploitation pour protéger, comprendre et faire progresser tes comptes financés.", "The operating system to protect, understand, and grow your funded accounts.")}</p>
        <p className="mt-5 text-[11px] text-[#7C8493]">{t("PipsEvo ne fournit aucun signal ni conseil financier.", "PipsEvo provides no signals or financial advice.")}</p>
        <form onSubmit={subscribe} className="mt-7 max-w-sm" aria-label={t("Inscription à la newsletter", "Newsletter subscription")}>
          <label htmlFor="footer-newsletter-email" className="text-xs font-semibold uppercase tracking-[.14em] text-[#AEB4BF]">{t("Newsletter PipsEvo", "PipsEvo newsletter")}</label>
          <p className="mt-2 text-xs leading-5 text-[#747C8B]">{t("Guides de discipline, nouveautés produit et conseils de gestion du risque.", "Discipline guides, product updates and risk-management insights.")}</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input id="footer-newsletter-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder={t("ton@email.com", "you@email.com")} className="min-w-0 flex-1 rounded-xl border border-white/[0.1] bg-[#0B0E18] px-4 py-3 text-sm text-white outline-none transition placeholder:text-[#505766] focus:border-[#7C4DFF] focus:ring-2 focus:ring-[#7C4DFF]/20" />
            <button type="submit" disabled={newsletterState === "loading"} className="rounded-xl bg-[#7C4DFF] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#8B63FF] disabled:cursor-wait disabled:opacity-60">{newsletterState === "loading" ? t("Envoi…", "Sending…") : t("S’inscrire", "Subscribe")}</button>
          </div>
          <p className="mt-2 text-[10px] leading-4 text-[#7C8493]">{t("Confirmation par e-mail requise. Désinscription en un clic.", "Email confirmation required. Unsubscribe in one click.")} <Link to="/privacy" className="underline decoration-white/20 underline-offset-2 hover:text-white">{t("Confidentialité", "Privacy")}</Link></p>
          {newsletterMessage && <p role="status" aria-live="polite" className={`mt-3 text-xs ${newsletterState === "success" ? "text-[#46C99A]" : "text-[#FF7A87]"}`}>{newsletterMessage}</p>}
        </form>
      </div>
      {footerGroups(t).map(([title, links]) => <div key={title}>
        <h2 className="text-xs font-semibold uppercase tracking-[.16em] text-[#AEB4BF]">{title}</h2>
        <div className="mt-5 space-y-3">
          {links.map(([label, href]) => <Link key={`${label}-${href}`} to={href} className="block text-sm text-[#747C8B] transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C4DFF]/60">{label}</Link>)}
        </div>
      </div>)}
    </div>
    <div className="mx-auto mt-12 flex max-w-[1280px] flex-col gap-5 border-t border-white/[0.07] pt-7 text-xs text-[#7C8493] sm:flex-row sm:items-center sm:justify-between">
      <span>© {new Date().getFullYear()} PipsEvo. {t("Tous droits réservés.", "All rights reserved.")}</span>
      <div className="flex flex-wrap items-center gap-4">
        <button type="button" onClick={() => setLanguage("fr")} className={`inline-flex items-center gap-2 transition hover:text-white ${language === "fr" ? "text-[#B6A4FF]" : ""}`}><CountryFlag language="fr" />Français</button>
        <button type="button" onClick={() => setLanguage("en")} className={`inline-flex items-center gap-2 transition hover:text-white ${language === "en" ? "text-[#B6A4FF]" : ""}`}><CountryFlag language="en" />English</button>
        <button type="button" onClick={openCookieSettings} className="transition hover:text-white">{t("Gérer les cookies", "Manage cookies")}</button>
        <MotionPreferenceControl />
      </div>
    </div>
  </footer>;
}
