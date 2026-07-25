import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Logo, LogoMark } from "@/components/Logo";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/context/I18nContext";

const itemClass = "rounded-xl px-4 py-3 text-[#D4D7DF] transition hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C4DFF]/60";

export default function PublicHeader() {
  const { user, loading } = useAuth();
  const { language, t } = useI18n();
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuButtonRef = useRef(null);
  const menuPanelRef = useRef(null);
  const firstItemRef = useRef(null);
  const authenticated = Boolean(user);
  const accountPath = authenticated ? "/app/dashboard" : "/login";
  const accountLabel = authenticated ? t("Tableau de bord", "Dashboard") : t("Connexion", "Sign in");

  useEffect(() => {
    if (!mobileOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    const menuButton = menuButtonRef.current;
    document.body.style.overflow = "hidden";
    window.requestAnimationFrame(() => firstItemRef.current?.focus());

    const closeOnDesktop = () => { if (window.innerWidth >= 768) setMobileOpen(false); };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = menuPanelRef.current?.querySelectorAll("a[href], button:not([disabled])");
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", closeOnDesktop);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", closeOnDesktop);
      document.body.style.overflow = previousOverflow;
      menuButton?.focus();
    };
  }, [mobileOpen]);

  const closeMenu = () => setMobileOpen(false);

  return <>
    <a href="#main-content" className="fixed left-4 top-2 z-[70] -translate-y-16 rounded-lg bg-[#7C4DFF] px-3 py-2 text-sm font-semibold text-white transition focus:translate-y-0">{t("Aller au contenu", "Skip to content")}</a>
    <header className="sticky top-0 z-50 h-[66px] border-b border-white/5 bg-[#050505]/90 backdrop-blur-xl md:h-[72px]">
      <div className="mx-auto flex h-full max-w-6xl min-w-0 items-center justify-between gap-2 px-5 sm:px-6">
        <Link to="/" aria-label={t("PipsEvo — accueil", "PipsEvo — home")} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C4DFF]/70 min-[360px]:hidden">
          <LogoMark size="sm" className="!h-[26px] !w-[26px]" />
        </Link>
        <Logo size="lg" className="hidden !h-8 !w-[142px] min-[360px]:inline-flex md:!h-9 md:!w-[160px] lg:!h-10 lg:!w-[178px]" />

        <nav aria-label={t("Navigation principale", "Primary navigation")} className="hidden items-center gap-5 text-sm text-[#B5BBC9] md:flex lg:gap-7">
          <Link to="/pricing" className="transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C4DFF]/60">{t("Tarifs", "Pricing")}</Link>
          <Link to="/faq" className="transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C4DFF]/60">FAQ</Link>
          <Link to="/contact" className="hidden transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C4DFF]/60 lg:inline">Contact</Link>
        </nav>

        <div className="flex min-w-0 shrink-0 items-center gap-1.5 sm:gap-2">
          <div className="hidden md:block"><LanguageSwitcher compact /></div>
          {loading ? <span aria-hidden="true" className="h-10 w-24 animate-pulse rounded-xl border border-white/5 bg-white/[0.03] sm:h-11" /> : <Link to={accountPath} data-testid="public-auth-action" className="inline-flex h-10 items-center justify-center whitespace-nowrap rounded-xl border border-[#7C4DFF]/35 bg-[#7C4DFF]/[0.12] px-4 text-[15px] font-semibold text-[#D6C7FF] transition hover:border-[#7C4DFF]/65 hover:bg-[#7C4DFF]/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C4DFF]/70 sm:h-11 sm:px-5 sm:text-base">
            {accountLabel}
          </Link>}
          {!loading && !authenticated && <Link to="/register" className="btn-primary hidden h-11 items-center whitespace-nowrap !rounded-xl !px-4 text-sm md:inline-flex lg:!px-5">{t("Accès gratuit", "Free access")}</Link>}
          <button
            ref={menuButtonRef}
            type="button"
            data-testid="public-mobile-menu-button"
            aria-label={mobileOpen ? t("Fermer le menu", "Close menu") : t("Ouvrir le menu", "Open menu")}
            aria-expanded={mobileOpen}
            aria-controls="public-mobile-menu"
            onClick={() => setMobileOpen(open => !open)}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-white transition hover:border-[#7C4DFF]/50 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C4DFF]/70 md:hidden"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </header>

    {mobileOpen && <div className="fixed inset-0 top-[66px] z-40 md:hidden">
      <button type="button" aria-label={t("Fermer le menu", "Close menu")} onClick={closeMenu} className="absolute inset-0 h-full w-full bg-black/75 backdrop-blur-sm" />
      <div id="public-mobile-menu" ref={menuPanelRef} role="dialog" aria-modal="true" aria-label={t("Navigation mobile", "Mobile navigation")} className="relative mx-5 mt-3 max-h-[calc(100dvh-90px)] overflow-y-auto rounded-2xl border border-white/10 bg-[#0A0B12]/95 p-3 shadow-2xl sm:mx-6 sm:ml-auto sm:max-w-sm">
        <nav className="flex flex-col gap-1 text-sm">
          {!loading && !authenticated && <Link ref={firstItemRef} to="/register" onClick={closeMenu} className="btn-primary mb-2 inline-flex h-12 items-center justify-center whitespace-nowrap !rounded-xl !px-4">{t("Accès gratuit", "Free access")}</Link>}
          {!loading && authenticated && <Link ref={firstItemRef} to="/app/dashboard" onClick={closeMenu} className="btn-primary mb-2 inline-flex h-12 items-center justify-center whitespace-nowrap !rounded-xl !px-4">{accountLabel}</Link>}
          <Link ref={loading ? firstItemRef : undefined} to="/" onClick={closeMenu} className={itemClass}>{t("Accueil", "Home")}</Link>
          <a href="/#features" onClick={closeMenu} className={itemClass}>{t("Fonctionnalités", "Features")}</a>
          <a href="/#how" onClick={closeMenu} className={itemClass}>{t("Fonctionnement", "How it works")}</a>
          <Link to="/pricing" onClick={closeMenu} className={itemClass}>{t("Tarifs", "Pricing")}</Link>
          <a href="/#reviews" onClick={closeMenu} className={itemClass}>{t("Bêta", "Beta")}</a>
          <Link to="/faq" onClick={closeMenu} className={itemClass}>FAQ</Link>
          <Link to="/contact" onClick={closeMenu} className={itemClass}>Contact</Link>
          <Link to="/affiliate" onClick={closeMenu} className={itemClass}>{t("Programme partenaire", "Partner program")}</Link>
          <Link to="/platforms" onClick={closeMenu} className={itemClass}>{t("Plateformes et imports", "Platforms and imports")}</Link>
          <div className="mt-2 flex items-center justify-between border-t border-white/10 px-4 pt-3"><span className="text-xs text-[#8E96A7]">{t("Langue", "Language")}</span><LanguageSwitcher /></div>
          <span className="sr-only" aria-live="polite">{language === "fr" ? "Menu en français" : "Menu in English"}</span>
        </nav>
      </div>
    </div>}
  </>;
}
