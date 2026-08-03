import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronDown, LayoutDashboard, LogOut, Menu, Settings, User, X } from "lucide-react";
import { toast } from "sonner";
import { Logo, LogoMark } from "@/components/Logo";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/context/I18nContext";

const itemClass = "rounded-xl px-4 py-3 text-[#D4D7DF] transition hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C4DFF]/60";

function getProfileIdentity(user, t) {
  const metadataName = user?.user_metadata?.display_name || user?.display_name || user?.full_name;
  const profileName = user?.name;
  const emailPrefix = user?.email?.split("@")[0] || "";
  const fallbackProfileName = user?.profile_loading_error && profileName === emailPrefix ? "" : profileName;
  const name = String(metadataName || fallbackProfileName || "").trim();

  if (!name) return { label: t("Mon compte", "My account"), initials: "" };

  const words = name.split(/\s+/).filter(Boolean);
  const initials = words.length > 1
    ? `${words[0][0]}${words[words.length - 1][0]}`
    : words[0].slice(0, 2);

  return { label: words[0], initials: initials.toLocaleUpperCase() };
}

function ProfileMenu({ user, logout, t }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const containerRef = useRef(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const { label, initials } = getProfileIdentity(user, t);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const openAndFocusMenu = () => {
    setOpen(true);
    window.requestAnimationFrame(() => menuRef.current?.querySelector('[role="menuitem"]')?.focus());
  };

  const handleButtonKeyDown = (event) => {
    if (["ArrowDown", "Enter", " "].includes(event.key) && !open) {
      event.preventDefault();
      openAndFocusMenu();
    }
  };

  const handleMenuKeyDown = (event) => {
    const items = Array.from(menuRef.current?.querySelectorAll('[role="menuitem"]') || []);
    if (!items.length) return;
    const currentIndex = items.indexOf(document.activeElement);
    let nextIndex;

    if (event.key === "ArrowDown") nextIndex = (currentIndex + 1) % items.length;
    else if (event.key === "ArrowUp") nextIndex = (currentIndex - 1 + items.length) % items.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = items.length - 1;
    else return;

    event.preventDefault();
    items[nextIndex].focus();
  };

  const handleLogout = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await logout("local");
      setOpen(false);
      navigate("/", { replace: true });
    } catch (error) {
      toast.error(t("Impossible de te déconnecter. Réessaie.", "Unable to sign out. Please try again."));
      setSigningOut(false);
    }
  };

  return <div ref={containerRef} className="relative shrink-0">
    <button
      ref={buttonRef}
      type="button"
      data-testid="public-profile-button"
      aria-haspopup="menu"
      aria-expanded={open}
      aria-controls="public-profile-menu"
      aria-label={t(`Ouvrir le menu du profil de ${label}`, `Open ${label}'s profile menu`)}
      onClick={() => setOpen(value => !value)}
      onKeyDown={handleButtonKeyDown}
      className="group inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-[#0C0D15]/90 text-white shadow-[0_12px_30px_rgba(0,0,0,.2)] transition hover:border-[#7C4DFF]/55 hover:bg-[#111322] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C4DFF]/70 md:h-11 md:w-auto md:gap-2 md:px-2 md:pr-3"
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#8B5CFF] via-[#6848FF] to-[#2F8CFF] text-[11px] font-bold tracking-wide text-white shadow-[0_0_18px_rgba(124,77,255,.3)] md:h-8 md:w-8 md:text-xs">
        {initials || <User aria-hidden="true" className="h-4 w-4" />}
      </span>
      <span className="hidden max-w-[120px] truncate text-sm font-semibold text-[#E8EAF0] md:block">{label}</span>
      <ChevronDown aria-hidden="true" className={`hidden h-4 w-4 text-[#8991A2] transition md:block ${open ? "rotate-180 text-white" : "group-hover:text-white"}`} />
    </button>

    {open && <div
      id="public-profile-menu"
      ref={menuRef}
      role="menu"
      aria-label={t("Menu du profil", "Profile menu")}
      onKeyDown={handleMenuKeyDown}
      className="absolute right-0 top-full z-[70] mt-2 w-[240px] overflow-hidden rounded-2xl border border-white/10 bg-[#0A0B12]/[0.98] p-2 shadow-[0_24px_70px_rgba(0,0,0,.55)] backdrop-blur-xl"
    >
      <div className="mb-1 border-b border-white/[0.08] px-3 py-2.5">
        <p className="truncate text-sm font-semibold text-white">{label}</p>
        <p className="mt-0.5 text-xs text-[#7F8797]">{t("Espace personnel", "Personal workspace")}</p>
      </div>
      <Link role="menuitem" to="/app/dashboard" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[#D6DAE3] transition hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#7C4DFF]/60">
        <LayoutDashboard aria-hidden="true" className="h-4 w-4 text-[#9B7BFF]" />
        {t("Tableau de bord", "Dashboard")}
      </Link>
      <Link role="menuitem" to="/app/settings" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[#D6DAE3] transition hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#7C4DFF]/60">
        <Settings aria-hidden="true" className="h-4 w-4 text-[#8991A2]" />
        {t("Paramètres", "Settings")}
      </Link>
      <button role="menuitem" type="button" disabled={signingOut} onClick={handleLogout} className="mt-1 flex w-full items-center gap-3 rounded-xl border-t border-white/[0.06] px-3 py-2.5 text-left text-sm text-[#FF9B9B] transition hover:bg-red-500/[0.08] hover:text-[#FFB8B8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-red-400/40 disabled:cursor-wait disabled:opacity-60">
        <LogOut aria-hidden="true" className="h-4 w-4" />
        {signingOut ? t("Déconnexion...", "Signing out...") : t("Déconnexion", "Sign out")}
      </button>
    </div>}
  </div>;
}

export default function PublicHeader({ variant = "default" }) {
  const { user, loading, logout } = useAuth();
  const { language, t } = useI18n();
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuButtonRef = useRef(null);
  const menuPanelRef = useRef(null);
  const firstItemRef = useRef(null);
  const authenticated = Boolean(user);
  const landing = variant === "landing";

  useEffect(() => {
    if (!mobileOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    const menuButton = menuButtonRef.current;
    document.body.style.overflow = "hidden";
    window.requestAnimationFrame(() => firstItemRef.current?.focus());

    const closeOnDesktop = () => {
      const desktopBreakpoint = landing ? 1024 : 768;
      if (window.innerWidth >= desktopBreakpoint) setMobileOpen(false);
    };
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
  }, [landing, mobileOpen]);

  const closeMenu = () => setMobileOpen(false);
  const headerClass = landing
    ? "fixed left-0 right-0 top-0 z-50 h-[61px] border-b border-white/5 bg-[#050505]/85 backdrop-blur-xl md:h-[72px] lg:h-[80px]"
    : "sticky top-0 z-50 h-[66px] border-b border-white/5 bg-[#050505]/90 backdrop-blur-xl md:h-[72px]";
  const innerClass = landing
    ? "mx-auto flex h-full max-w-7xl min-w-0 items-center justify-between gap-2 px-3 sm:px-5 lg:px-4 xl:px-10"
    : "mx-auto flex h-full max-w-6xl min-w-0 items-center justify-between gap-2 px-5 sm:px-6";

  return <>
    <a href="#main-content" className="fixed left-4 top-2 z-[80] -translate-y-16 rounded-lg bg-[#7C4DFF] px-3 py-2 text-sm font-semibold text-white transition focus:translate-y-0">{t("Aller au contenu", "Skip to content")}</a>
    <header className={headerClass}>
      <div className={innerClass}>
        <Link to="/" aria-label={t("PipsEvo — accueil", "PipsEvo — home")} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C4DFF]/70 min-[360px]:hidden">
          <LogoMark size="sm" className="!h-[26px] !w-[26px]" />
        </Link>
        <Logo size="lg" className={`hidden !h-8 min-[360px]:inline-flex md:!h-[34px] ${landing ? "!w-[124px] min-[360px]:!w-[136px] md:!w-[151px] xl:!h-[38px] xl:!w-[168px]" : "!w-[142px] md:!w-[151px] lg:!h-[35px] lg:!w-[155px]"}`} />

        <nav aria-label={t("Navigation principale", "Primary navigation")} className={`hidden items-center text-sm text-[#B5BBC9] ${landing ? "gap-4 text-xs lg:flex lg:gap-6 xl:gap-8 xl:text-sm" : "gap-5 md:flex lg:gap-7"}`}>
          {landing && <>
            <a href="#features" className="transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C4DFF]/60">{t("Fonctionnalités", "Features")}</a>
            <a href="#how" className="transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C4DFF]/60">{t("Fonctionnement", "How it works")}</a>
          </>}
          <Link to="/pricing" className="transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C4DFF]/60">{t("Tarifs", "Pricing")}</Link>
          {landing && <a href="#reviews" className="transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C4DFF]/60">{t("Bêta", "Beta")}</a>}
          <Link to="/faq" className="transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C4DFF]/60">FAQ</Link>
          <Link to="/contact" className={`transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C4DFF]/60 ${landing ? "" : "hidden lg:inline"}`}>Contact</Link>
        </nav>

        <div className="flex min-w-0 shrink-0 items-center gap-1.5 sm:gap-2">
          <div className={landing ? "hidden lg:block" : "hidden md:block"}><LanguageSwitcher compact /></div>
          {loading && <span data-testid="public-auth-loading" aria-label={t("Chargement de la session", "Loading session")} className="h-10 w-10 animate-pulse rounded-xl border border-white/5 bg-white/[0.04] md:h-11 md:w-24" />}
          {!loading && authenticated && <ProfileMenu user={user} logout={logout} t={t} />}
          {!loading && !authenticated && <Link to="/login" data-testid="public-auth-action" className="inline-flex h-10 items-center justify-center whitespace-nowrap rounded-xl border border-[#7C4DFF]/35 bg-[#7C4DFF]/[0.12] px-4 text-[15px] font-semibold text-[#D6C7FF] transition hover:border-[#7C4DFF]/65 hover:bg-[#7C4DFF]/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C4DFF]/70 sm:h-11 sm:px-5 sm:text-base">
            {t("Connexion", "Sign in")}
          </Link>}
          {!loading && !authenticated && <Link to="/register" className={`btn-primary hidden h-11 items-center whitespace-nowrap !rounded-xl !px-4 text-sm lg:!px-5 ${landing ? "lg:inline-flex" : "md:inline-flex"}`}>{t("Accès gratuit", "Free access")}</Link>}
          <button
            ref={menuButtonRef}
            type="button"
            data-testid="public-mobile-menu-button"
            aria-label={mobileOpen ? t("Fermer le menu", "Close menu") : t("Ouvrir le menu", "Open menu")}
            aria-expanded={mobileOpen}
            aria-controls="public-mobile-menu"
            onClick={() => setMobileOpen(open => !open)}
            className={`h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-white transition hover:border-[#7C4DFF]/50 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C4DFF]/70 sm:h-11 sm:w-11 ${landing ? "inline-flex lg:hidden" : "inline-flex md:hidden"}`}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </header>

    {mobileOpen && <div className={`fixed inset-0 z-40 ${landing ? "top-[61px] lg:hidden" : "top-[66px] md:hidden"}`}>
      <button type="button" aria-label={t("Fermer le menu", "Close menu")} onClick={closeMenu} className="absolute inset-0 h-full w-full bg-black/75 backdrop-blur-sm" />
      <div id="public-mobile-menu" ref={menuPanelRef} role="dialog" aria-modal="true" aria-label={t("Navigation mobile", "Mobile navigation")} className="relative mx-3 mt-3 max-h-[calc(100dvh-90px)] overflow-y-auto rounded-2xl border border-white/10 bg-[#0A0B12]/95 p-3 shadow-2xl sm:mx-6 sm:ml-auto sm:max-w-sm">
        <nav className="flex flex-col gap-1 text-sm">
          {!loading && !authenticated && <Link ref={firstItemRef} to="/register" onClick={closeMenu} className="btn-primary mb-2 inline-flex h-12 items-center justify-center whitespace-nowrap !rounded-xl !px-4">{t("Accès gratuit", "Free access")}</Link>}
          <Link ref={loading || authenticated ? firstItemRef : undefined} to="/" onClick={closeMenu} className={itemClass}>{t("Accueil", "Home")}</Link>
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
