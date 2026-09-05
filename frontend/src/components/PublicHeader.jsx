import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BarChart3,
  BookOpen,
  Brain,
  ChevronDown,
  CircleHelp,
  FileText,
  FlaskConical,
  Gauge,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  MessageSquare,
  Settings,
  Shield,
  User,
  WalletCards,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Logo, LogoMark } from "@/components/Logo";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/context/I18nContext";
import { MotionOverlay, MotionPopover, Presence } from "./motion/MotionSystem";

const itemClass = "rounded-xl px-4 py-3 text-[#D4D7DF] transition hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C4DFF]/60";

const featureGroups = [
  { title: "Trading", items: [
    { label: "Journal", href: "/#journal", icon: BookOpen },
    { label: "Comptes", href: "/#accounts", icon: WalletCards },
    { label: "Statistiques", href: "/#product", icon: BarChart3 },
    { label: "Backtest", href: "/#tools", icon: FlaskConical },
  ] },
  { title: "Protection", items: [
    { label: "Discipline", href: "/#discipline", icon: Shield },
    { label: "Gestion du risque", href: "/#risk-control", icon: Gauge },
    { label: "Payouts", href: "/#payouts", icon: WalletCards },
    { label: "Prop firms", href: "/platforms", icon: LayoutDashboard },
  ] },
  { title: "Intelligence", items: [
    { label: "Atlas IA", href: "/#atlas", icon: Brain },
    { label: "Analyse comportementale", href: "/#atlas", icon: BarChart3 },
    { label: "Rapports & Trading DNA", href: "/#tools", icon: Shield },
  ] },
];

const resourceItems = [
  { label: "Centre d’aide", href: "/help", icon: LifeBuoy },
  { label: "FAQ", href: "/faq", icon: CircleHelp },
  { label: "Contact", href: "/contact", icon: MessageSquare },
  { label: "Guides", href: "/blog", icon: FileText },
  { label: "Plateformes et imports", href: "/platforms", icon: LayoutDashboard },
];

const featureLabelEn = {
  Comptes: "Accounts",
  Statistiques: "Analytics",
  Discipline: "Discipline",
  "Gestion du risque": "Risk management",
  "Prop firms": "Prop firms",
  "Atlas IA": "Atlas AI",
  "Analyse comportementale": "Behavioral analysis",
  "Rapports & Trading DNA": "Reports & Trading DNA",
};

export function CountryFlag({ language }) {
  if (language === "fr") return <span aria-hidden="true" className="grid h-3.5 w-5 grid-cols-3 overflow-hidden rounded-[3px] ring-1 ring-white/10"><i className="bg-[#1B3D8F]" /><i className="bg-white" /><i className="bg-[#E53B4D]" /></span>;
  return <span aria-hidden="true" className="relative h-3.5 w-5 overflow-hidden rounded-[3px] bg-[#21468B] ring-1 ring-white/10">
    <i className="absolute left-1/2 top-1/2 h-[3px] w-7 -translate-x-1/2 -translate-y-1/2 rotate-[35deg] bg-white" />
    <i className="absolute left-1/2 top-1/2 h-[3px] w-7 -translate-x-1/2 -translate-y-1/2 -rotate-[35deg] bg-white" />
    <i className="absolute left-1/2 top-1/2 h-[1px] w-7 -translate-x-1/2 -translate-y-1/2 rotate-[35deg] bg-[#CF142B]" />
    <i className="absolute left-1/2 top-1/2 h-[1px] w-7 -translate-x-1/2 -translate-y-1/2 -rotate-[35deg] bg-[#CF142B]" />
    <i className="absolute left-1/2 top-0 h-full w-[5px] -translate-x-1/2 bg-white" />
    <i className="absolute left-0 top-1/2 h-[5px] w-full -translate-y-1/2 bg-white" />
    <i className="absolute left-1/2 top-0 h-full w-[2px] -translate-x-1/2 bg-[#CF142B]" />
    <i className="absolute left-0 top-1/2 h-[2px] w-full -translate-y-1/2 bg-[#CF142B]" />
  </span>;
}

function LanguageMenu({ language, setLanguage, t, onSelect }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => { if (!ref.current?.contains(event.target)) setOpen(false); };
    const escape = (event) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  const select = (next) => {
    setLanguage?.(next);
    setOpen(false);
    onSelect?.();
  };

  return <div ref={ref} className="relative">
    <button type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(value => !value)} className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.025] px-3 text-xs font-semibold text-[#D6DAE3] transition hover:border-white/20 hover:bg-white/[0.05] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C4DFF]/60">
      <CountryFlag language={language} />
      <span>{language.toUpperCase()}</span>
      <ChevronDown className={`h-3.5 w-3.5 text-[#7F8797] transition ${open ? "rotate-180" : ""}`} />
    </button>
    <Presence show={open}><MotionPopover role="menu" className="absolute right-0 top-full z-[80] mt-2 w-44 rounded-2xl border border-white/10 bg-[#0A0B12]/[0.98] p-2 shadow-[0_24px_70px_rgba(0,0,0,.55)] backdrop-blur-xl">
      <button role="menuitem" type="button" onClick={() => select("fr")} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition hover:bg-white/[0.06] ${language === "fr" ? "bg-white/[0.05] text-white" : "text-[#B5BBC9]"}`}><CountryFlag language="fr" />{t("Français", "French")}</button>
      <button role="menuitem" type="button" onClick={() => select("en")} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition hover:bg-white/[0.06] ${language === "en" ? "bg-white/[0.05] text-white" : "text-[#B5BBC9]"}`}><CountryFlag language="en" />English</button>
    </MotionPopover></Presence>
  </div>;
}

function MegaMenu({ id, label, open, onToggle, children, widthClass = "w-[720px]" }) {
  return <div className="relative">
    <button type="button" aria-haspopup="menu" aria-expanded={open} aria-controls={open ? id : undefined} onClick={onToggle} className="inline-flex items-center gap-1.5 py-3 text-sm text-[#B5BBC9] transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C4DFF]/60">
      <span>{label}</span><ChevronDown className={`h-3.5 w-3.5 transition ${open ? "rotate-180 text-white" : ""}`} />
    </button>
    <div className={`absolute left-1/2 top-full z-[70] mt-3 -translate-x-1/2 ${widthClass}`}>
      <Presence show={open}><MotionPopover id={id} role="menu" className="w-full rounded-2xl border border-white/10 bg-[#090A10]/[0.98] p-3 shadow-[0_28px_80px_rgba(0,0,0,.65)] backdrop-blur-2xl">{children}</MotionPopover></Presence>
    </div>
  </div>;
}

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

    <Presence show={open}><MotionPopover
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
    </MotionPopover></Presence>
  </div>;
}

export default function PublicHeader({ variant = "default" }) {
  const { user, loading, logout } = useAuth();
  const { language, setLanguage, t } = useI18n();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);
  const menuButtonRef = useRef(null);
  const menuPanelRef = useRef(null);
  const firstItemRef = useRef(null);
  const navRef = useRef(null);
  const authenticated = Boolean(user);
  const landing = variant === "landing";

  useEffect(() => {
    if (!openMenu) return undefined;
    const close = (event) => { if (!navRef.current?.contains(event.target)) setOpenMenu(null); };
    const escape = (event) => { if (event.key === "Escape") setOpenMenu(null); };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [openMenu]);

  useEffect(() => {
    if (!mobileOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    const menuButton = menuButtonRef.current;
    document.body.style.overflow = "hidden";
    window.requestAnimationFrame(() => firstItemRef.current?.focus());

    const closeOnDesktop = () => {
      const desktopBreakpoint = landing ? 1120 : 768;
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
    ? "fixed left-0 right-0 top-7 z-50 h-[68px] border-b border-white/5 bg-[#050505]/90 backdrop-blur-xl md:top-8 md:h-[74px]"
    : "sticky top-0 z-50 h-[66px] border-b border-white/5 bg-[#050505]/90 backdrop-blur-xl md:h-[72px]";
  const innerClass = landing
    ? "mx-auto flex h-full max-w-[1480px] min-w-0 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8"
    : "mx-auto flex h-full max-w-6xl min-w-0 items-center justify-between gap-2 px-5 sm:px-6";

  return <>
    <nav aria-label={t("Accès rapide", "Quick access")}><a href="#main-content" className="fixed left-4 top-2 z-[80] -translate-y-16 rounded-lg bg-[#7C4DFF] px-3 py-2 text-sm font-semibold text-white transition focus:translate-y-0">{t("Aller au contenu", "Skip to content")}</a></nav>
    {landing && <div role="region" aria-label={t("Annonce bêta", "Beta announcement")} className="fixed inset-x-0 top-0 z-[60] flex h-7 items-center justify-center gap-2 border-b border-white/[0.05] bg-[#050505]/95 px-4 text-center text-[10px] font-medium tracking-wide text-[#AEB4C1] backdrop-blur-xl md:h-8 md:text-xs">
      <span className="h-1.5 w-1.5 rounded-full bg-[#46C99A]" />
      <span>{t("Bêta publique — accès gratuit sans carte bancaire", "Public beta — free access, no credit card required")}</span>
      <Link to="/register" className="hidden text-[#C7B5FF] transition hover:text-white sm:inline">{t("Rejoindre la bêta →", "Join the beta →")}</Link>
    </div>}
    <header className={headerClass}>
      <div className={innerClass}>
        <Link to="/" aria-label={t("PipsEvo — accueil", "PipsEvo — home")} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C4DFF]/70 min-[360px]:hidden">
          <LogoMark size="sm" className="!h-[26px] !w-[26px]" />
        </Link>
        <Logo size="lg" className={`hidden !h-8 min-[360px]:inline-flex md:!h-[34px] ${landing ? "!w-[124px] min-[360px]:!w-[136px] md:!w-[151px] xl:!h-[38px] xl:!w-[168px]" : "!w-[142px] md:!w-[151px] lg:!h-[35px] lg:!w-[155px]"}`} />

        <nav ref={navRef} aria-label={t("Navigation principale", "Primary navigation")} className={`hidden items-center text-sm text-[#B5BBC9] ${landing ? "gap-7 min-[1120px]:flex" : "gap-5 md:flex lg:gap-7"}`}>
          {landing ? <>
            <MegaMenu id="features-menu" label={t("Fonctionnalités", "Features")} open={openMenu === "features"} onToggle={() => setOpenMenu(value => value === "features" ? null : "features")}>
              <div className="grid grid-cols-3 gap-2">
                {featureGroups.map(group => <div key={group.title} className="rounded-xl p-2">
                  <div className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[.18em] text-[#777F90]">{group.title}</div>
                  <div className="space-y-1">{group.items.map(({ label, href, icon: Icon }) => <a role="menuitem" key={label} href={href} onClick={() => setOpenMenu(null)} className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm text-[#C9CDD6] transition hover:bg-white/[0.055] hover:text-white"><Icon className="h-4 w-4 text-[#8E72FF]" /><span>{t(label, featureLabelEn[label] || label)}</span></a>)}</div>
                </div>)}
              </div>
            </MegaMenu>
            <Link to="/platforms" className="py-3 transition hover:text-white">Prop Firms</Link>
            <Link to="/pricing" className="py-3 transition hover:text-white">{t("Tarifs", "Pricing")}</Link>
            <MegaMenu id="resources-menu" label={t("Ressources", "Resources")} open={openMenu === "resources"} onToggle={() => setOpenMenu(value => value === "resources" ? null : "resources")} widthClass="w-[330px]">
              <div className="space-y-1">{resourceItems.map(({ label, href, icon: Icon }) => <Link role="menuitem" key={label} to={href} onClick={() => setOpenMenu(null)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[#C9CDD6] transition hover:bg-white/[0.055] hover:text-white"><Icon className="h-4 w-4 text-[#8E72FF]" /><span>{t(label, label)}</span></Link>)}</div>
            </MegaMenu>
            <Link to="/help" className="py-3 transition hover:text-white">{t("Centre d’aide", "Help center")}</Link>
          </> : <>
            <Link to="/platforms" className="transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C4DFF]/60">{t("Plateformes", "Platforms")}</Link>
            <Link to="/pricing" className="transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C4DFF]/60">{t("Tarifs", "Pricing")}</Link>
            <Link to="/faq" className="transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C4DFF]/60">FAQ</Link>
            <Link to="/contact" className="hidden transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C4DFF]/60 lg:inline">Contact</Link>
          </>}
        </nav>

        <div className="flex min-w-0 shrink-0 items-center gap-1.5 sm:gap-2">
          <div className={landing ? "hidden min-[1120px]:block" : "hidden md:block"}>{landing ? <LanguageMenu language={language} setLanguage={setLanguage} t={t} /> : <LanguageSwitcher compact />}</div>
          {loading && <span data-testid="public-auth-loading" aria-label={t("Chargement de la session", "Loading session")} className="h-10 w-10 animate-pulse rounded-xl border border-white/5 bg-white/[0.04] md:h-11 md:w-24" />}
          {!loading && authenticated && <ProfileMenu user={user} logout={logout} t={t} />}
          {!loading && !authenticated && <Link to="/login" data-testid="public-auth-action" className="inline-flex h-10 items-center justify-center whitespace-nowrap rounded-xl border border-[#7C4DFF]/35 bg-[#7C4DFF]/[0.12] px-4 text-[15px] font-semibold text-[#D6C7FF] transition hover:border-[#7C4DFF]/65 hover:bg-[#7C4DFF]/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C4DFF]/70 sm:h-11 sm:px-5 sm:text-base">
            {t("Connexion", "Sign in")}
          </Link>}
          {!loading && !authenticated && <Link to="/register" className={`btn-primary hidden h-11 items-center whitespace-nowrap !rounded-xl !px-4 text-sm lg:!px-5 ${landing ? "xl:inline-flex" : "md:inline-flex"}`}>{t("Accès gratuit", "Free access")}</Link>}
          <button
            ref={menuButtonRef}
            type="button"
            data-testid="public-mobile-menu-button"
            aria-label={mobileOpen ? t("Fermer le menu", "Close menu") : t("Ouvrir le menu", "Open menu")}
            aria-expanded={mobileOpen}
            aria-controls="public-mobile-menu"
            onClick={() => setMobileOpen(open => !open)}
            className={`h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-white transition hover:border-[#7C4DFF]/50 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C4DFF]/70 sm:h-11 sm:w-11 ${landing ? "inline-flex min-[1120px]:hidden" : "inline-flex md:hidden"}`}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </header>

    <Presence show={mobileOpen}><MotionOverlay className={`fixed inset-0 z-40 ${landing ? "top-[95px] md:top-[106px] min-[1120px]:hidden" : "top-[66px] md:hidden"}`}>
      <button type="button" aria-label={t("Fermer le menu", "Close menu")} onClick={closeMenu} className="absolute inset-0 h-full w-full bg-black/75 backdrop-blur-sm" />
      <MotionPopover id="public-mobile-menu" ref={menuPanelRef} role="dialog" aria-modal="true" aria-label={t("Navigation mobile", "Mobile navigation")} className="relative mx-3 mt-3 max-h-[calc(100dvh-90px)] overflow-y-auto rounded-2xl border border-white/10 bg-[#0A0B12]/95 p-3 shadow-2xl sm:mx-6 sm:ml-auto sm:max-w-sm">
        <nav className="flex flex-col gap-1 text-sm">
          {!loading && !authenticated && <Link ref={firstItemRef} to="/register" onClick={closeMenu} className="btn-primary mb-2 inline-flex h-12 items-center justify-center whitespace-nowrap !rounded-xl !px-4">{t("Accès gratuit", "Free access")}</Link>}
          <Link ref={loading || authenticated ? firstItemRef : undefined} to="/" onClick={closeMenu} className={itemClass}>{t("Accueil", "Home")}</Link>
          <div className="px-4 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-[.18em] text-[#686F7D]">{t("Produit", "Product")}</div>
          <a href="/#accounts" onClick={closeMenu} className={itemClass}>{t("Comptes financés", "Funded accounts")}</a>
          <a href="/#journal" onClick={closeMenu} className={itemClass}>Journal</a>
          <a href="/#discipline" onClick={closeMenu} className={itemClass}>{t("Discipline et risque", "Discipline and risk")}</a>
          <a href="/#atlas" onClick={closeMenu} className={itemClass}>Atlas IA</a>
          <Link to="/platforms" onClick={closeMenu} className={itemClass}>Prop Firms</Link>
          <a href="/#pricing" onClick={closeMenu} className={itemClass}>{t("Tarifs", "Pricing")}</a>
          <div className="px-4 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-[.18em] text-[#686F7D]">{t("Ressources", "Resources")}</div>
          <Link to="/help" onClick={closeMenu} className={itemClass}>{t("Centre d’aide", "Help center")}</Link>
          <Link to="/faq" onClick={closeMenu} className={itemClass}>FAQ</Link>
          <Link to="/contact" onClick={closeMenu} className={itemClass}>Contact</Link>
          <Link to="/platforms" onClick={closeMenu} className={itemClass}>{t("Plateformes et imports", "Platforms and imports")}</Link>
          <div className="mt-2 flex items-center justify-between border-t border-white/10 px-4 pt-3"><span className="text-xs text-[#8E96A7]">{t("Langue", "Language")}</span><LanguageMenu language={language} setLanguage={setLanguage} t={t} onSelect={closeMenu} /></div>
          <span className="sr-only" aria-live="polite">{language === "fr" ? "Menu en français" : "Menu in English"}</span>
        </nav>
      </MotionPopover>
    </MotionOverlay></Presence>
  </>;
}
