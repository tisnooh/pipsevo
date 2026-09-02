import React from "react";
import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { CountryFlag } from "@/components/PublicHeader";
import { openCookieSettings } from "@/components/CookieConsent";
import { useI18n } from "@/context/I18nContext";

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
    [t("Sécurité", "Security"), "/security"],
  ]],
];

export default function PublicFooter() {
  const { language, setLanguage, t } = useI18n();

  return <footer className="border-t border-white/[0.07] bg-[#050505] px-5 py-12 sm:px-6 lg:px-10 lg:py-16">
    <div className="mx-auto grid max-w-[1280px] gap-10 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
      <div>
        <Logo size="md" />
        <p className="mt-4 max-w-xs text-sm leading-6 text-[#777F8E]">{t("Le système d’exploitation pour protéger, comprendre et faire progresser tes comptes financés.", "The operating system to protect, understand, and grow your funded accounts.")}</p>
        <p className="mt-5 text-[11px] text-[#5F6673]">{t("PipsEvo ne fournit aucun signal ni conseil financier.", "PipsEvo provides no signals or financial advice.")}</p>
      </div>
      {footerGroups(t).map(([title, links]) => <div key={title}>
        <h2 className="text-xs font-semibold uppercase tracking-[.16em] text-[#AEB4BF]">{title}</h2>
        <div className="mt-5 space-y-3">
          {links.map(([label, href]) => <Link key={`${label}-${href}`} to={href} className="block text-sm text-[#747C8B] transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C4DFF]/60">{label}</Link>)}
        </div>
      </div>)}
    </div>
    <div className="mx-auto mt-12 flex max-w-[1280px] flex-col gap-5 border-t border-white/[0.07] pt-7 text-xs text-[#5E6572] sm:flex-row sm:items-center sm:justify-between">
      <span>© {new Date().getFullYear()} PipsEvo. {t("Tous droits réservés.", "All rights reserved.")}</span>
      <div className="flex flex-wrap items-center gap-4">
        <button type="button" onClick={() => setLanguage("fr")} className={`inline-flex items-center gap-2 transition hover:text-white ${language === "fr" ? "text-[#B6A4FF]" : ""}`}><CountryFlag language="fr" />Français</button>
        <button type="button" onClick={() => setLanguage("en")} className={`inline-flex items-center gap-2 transition hover:text-white ${language === "en" ? "text-[#B6A4FF]" : ""}`}><CountryFlag language="en" />English</button>
        <button type="button" onClick={openCookieSettings} className="transition hover:text-white">{t("Gérer les cookies", "Manage cookies")}</button>
      </div>
    </div>
  </footer>;
}
